/* The questions an owner actually asks about the practice, answered from the
   records already being kept.

   Everything here is read-only and derived. Nothing is stored as a "report",
   so a corrected payment or a re-graded session changes the numbers the next
   time the page renders rather than leaving a stale snapshot behind. */

import connectDB from "@/lib/db";
import { Patient, TreatmentSession, Payment } from "@/lib/models";
import { plain, computeBilling, getProfitAndLoss } from "@/lib/clinic";
import { clinicMonthsAgo, toDateInput, CLINIC_TZ } from "@/lib/format";

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

/* Diagnoses are free text, so "Frozen shoulder" and "frozen shoulder  " have to
   collapse into one row before they can be counted. The first spelling seen
   wins as the display label. */
const groupKey = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

function countBy(rows, field, { limit = 10 } = {}) {
  const buckets = new Map();

  for (const row of rows) {
    const key = groupKey(row[field]);
    if (!key) continue;
    const entry = buckets.get(key) || { label: String(row[field]).trim(), count: 0, patients: [] };
    entry.count += 1;
    entry.patients.push(row._id);
    buckets.set(key, entry);
  }

  return [...buckets.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

/* ------------------------------------------------------------------ main */

export async function getReports({ months = 12 } = {}) {
  await connectDB();

  const since = clinicMonthsAgo(months - 1);

  const [patients, statusRows, paidRows, monthlyNew, monthlyReturning, pnl] = await Promise.all([
    Patient.find({}, { name: 1, slug: 1, status: 1, diagnosis: 1, referredBy: 1, plan: 1, createdAt: 1 }).lean(),

    // Session outcomes per patient, which gives both the clinic-wide attendance
    // rate and the per-patient one from a single pass.
    TreatmentSession.aggregate([
      { $group: { _id: { patient: "$patient", status: "$status" }, n: { $sum: 1 } } },
    ]),

    Payment.aggregate([{ $group: { _id: "$patient", paid: { $sum: "$amount" }, payments: { $sum: 1 } } }]),

    Patient.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt", timezone: CLINIC_TZ } },
          n: { $sum: 1 },
        },
      },
    ]),

    // "Returning" means a visit attended in a month by someone who was already
    // on the books before that month started. Counted distinctly, so twelve
    // visits by one person is one returning patient, not twelve.
    TreatmentSession.aggregate([
      { $match: { status: "completed", scheduledAt: { $gte: since } } },
      {
        $lookup: { from: "patients", localField: "patient", foreignField: "_id", as: "p" },
      },
      { $unwind: "$p" },
      {
        $project: {
          patient: 1,
          month: { $dateToString: { format: "%Y-%m", date: "$scheduledAt", timezone: CLINIC_TZ } },
          registered: { $dateToString: { format: "%Y-%m", date: "$p.createdAt", timezone: CLINIC_TZ } },
        },
      },
      { $match: { $expr: { $lt: ["$registered", "$month"] } } },
      { $group: { _id: { month: "$month", patient: "$patient" } } },
      { $group: { _id: "$_id.month", n: { $sum: 1 } } },
    ]),

    getProfitAndLoss({ months }),
  ]);

  /* ---- fold the per-patient aggregates into one lookup ---- */

  const paidBy = new Map(paidRows.map((r) => [String(r._id), r.paid]));
  const countsBy = new Map();
  for (const row of statusRows) {
    const key = String(row._id.patient);
    const entry = countsBy.get(key) || { total: 0, completed: 0, cancelled: 0, no_show: 0, scheduled: 0 };
    entry[row._id.status] = row.n;
    entry.total += row.n;
    countsBy.set(key, entry);
  }

  const enriched = patients.map((p) => {
    const key = String(p._id);
    const counts = countsBy.get(key) || { total: 0, completed: 0, cancelled: 0, no_show: 0, scheduled: 0 };
    const paid = paidBy.get(key) || 0;
    return { ...p, counts, paid: round2(paid), billing: computeBilling(p.plan, paid) };
  });

  /* ---- revenue per patient ---- */

  const paying = enriched.filter((p) => p.paid > 0);
  const revenueTotal = round2(paying.reduce((sum, p) => sum + p.paid, 0));

  const topPatients = [...paying]
    .sort((a, b) => b.paid - a.paid)
    .slice(0, 10)
    .map((p) => ({
      _id: String(p._id),
      name: p.name,
      slug: p.slug,
      paid: p.paid,
      due: p.billing.due,
      completed: p.counts.completed,
    }));

  /* ---- who sends the patients ---- */

  const referrals = countBy(enriched, "referredBy", { limit: 12 }).map((entry) => {
    const revenue = entry.patients.reduce(
      (sum, id) => sum + (paidBy.get(String(id)) || 0),
      0
    );
    return { label: entry.label, count: entry.count, revenue: round2(revenue) };
  });

  const selfReferred = enriched.filter((p) => !groupKey(p.referredBy)).length;

  /* ---- what the clinic actually treats ---- */

  const diagnoses = countBy(enriched, "diagnosis", { limit: 12 }).map((entry) => ({
    label: entry.label,
    count: entry.count,
    share: pct(entry.count, enriched.length),
  }));

  /* ---- attendance ---- */

  const totals = enriched.reduce(
    (acc, p) => ({
      total: acc.total + p.counts.total,
      completed: acc.completed + p.counts.completed,
      cancelled: acc.cancelled + p.counts.cancelled,
      noShow: acc.noShow + p.counts.no_show,
      scheduled: acc.scheduled + p.counts.scheduled,
    }),
    { total: 0, completed: 0, cancelled: 0, noShow: 0, scheduled: 0 }
  );

  // Only sessions whose outcome is already known count towards the rate — a
  // booking still in the future is neither kept nor missed.
  const settled = totals.completed + totals.cancelled + totals.noShow;

  const attendance = {
    ...totals,
    settled,
    noShowRate: pct(totals.noShow, settled),
    cancelRate: pct(totals.cancelled, settled),
    keptRate: pct(totals.completed, settled),
  };

  // Worst offenders, but only where there are enough visits for a rate to mean
  // anything — one no-show out of one booking is not a pattern.
  const worstAttenders = enriched
    .map((p) => {
      const decided = p.counts.completed + p.counts.cancelled + p.counts.no_show;
      const missed = p.counts.no_show + p.counts.cancelled;
      return {
        _id: String(p._id),
        name: p.name,
        slug: p.slug,
        decided,
        missed,
        noShow: p.counts.no_show,
        cancelled: p.counts.cancelled,
        rate: pct(missed, decided),
      };
    })
    .filter((p) => p.decided >= 3 && p.missed > 0)
    .sort((a, b) => b.rate - a.rate || b.missed - a.missed)
    .slice(0, 10);

  /* ---- how a course of treatment ends ---- */

  const discharged = enriched.filter((p) => p.status === "completed" && p.counts.completed > 0);
  const avgSessionsToDischarge = discharged.length
    ? Math.round((discharged.reduce((sum, p) => sum + p.counts.completed, 0) / discharged.length) * 10) / 10
    : 0;

  const planned = enriched.filter((p) => (p.plan?.totalSessions || 0) > 0);
  const finishedPlan = planned.filter((p) => p.counts.completed >= p.plan.totalSessions).length;

  const packageCompletion = {
    withPlan: planned.length,
    finished: finishedPlan,
    rate: pct(finishedPlan, planned.length),
    // Sessions sold and paid for that nobody has attended yet — the clinic's
    // real delivery backlog.
    unusedSessions: planned.reduce(
      (sum, p) => sum + Math.max(0, p.plan.totalSessions - p.counts.completed),
      0
    ),
  };

  /* ---- new vs returning, month by month ---- */

  const newBy = new Map(monthlyNew.map((r) => [r._id, r.n]));
  const returningBy = new Map(monthlyReturning.map((r) => [r._id, r.n]));

  const growth = pnl.rows.map((row) => ({
    key: row.key,
    added: newBy.get(row.key) || 0,
    returning: returningBy.get(row.key) || 0,
    revenue: row.revenue,
  }));

  return plain({
    months,
    generatedFor: toDateInput(new Date()),
    pnl,
    growth,
    revenue: {
      total: revenueTotal,
      payingPatients: paying.length,
      perPatient: paying.length ? round2(revenueTotal / paying.length) : 0,
      outstanding: round2(enriched.reduce((sum, p) => sum + p.billing.due, 0)),
      topPatients,
    },
    referrals,
    selfReferred,
    diagnoses,
    attendance,
    worstAttenders,
    outcomes: {
      patientsTotal: enriched.length,
      discharged: discharged.length,
      avgSessionsToDischarge,
      ...packageCompletion,
    },
  });
}
