import mongoose from "mongoose";
import connectDB from "@/lib/db";
import {
  Patient,
  TreatmentSession,
  Payment,
  Assessment,
  Expense,
  Review,
  ServiceContent,
  ClinicSettings,
  TreatmentPackage,
  Counter,
  InstagramPost,
} from "@/lib/models";
import {
  clinicDayStart,
  clinicMonthStart,
  clinicMonthsAgo,
  toDateInput,
  CLINIC_TZ,
  DAY_MS,
} from "@/lib/format";
import { addDays, dateKeyOf, instantAt, rangeOfKeys, withDefaults } from "@/lib/hours";
import { financialYearOf, formatReceiptNo } from "@/lib/receipt";

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/* Deep-plains a mongoose lean() result so it can cross the server → client
   component boundary (ObjectId → string, Date → ISO string). */
export const plain = (v) => JSON.parse(JSON.stringify(v));

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ------------------------------------------------------- derived numbers */

/* Instalments: the plan stores a total fee and an instalment size. Everything
   else is derived from the payments actually recorded, so the ledger can never
   disagree with the summary. */
export function computeBilling(plan = {}, paidTotal = 0) {
  const feeTotal = round2(plan.feeTotal);
  const paid = round2(paidTotal);
  const due = Math.max(0, round2(feeTotal - paid));
  const installmentAmount = round2(plan.installmentAmount);

  let installmentsTotal = 0;
  let installmentsPaid = 0;
  let nextInstallment = 0;

  if (installmentAmount > 0 && feeTotal > 0) {
    installmentsTotal = Math.ceil(feeTotal / installmentAmount);
    installmentsPaid = Math.min(installmentsTotal, Math.floor(paid / installmentAmount));
    nextInstallment = due > 0 ? Math.min(installmentAmount, due) : 0;
  }

  return {
    feeTotal,
    paid,
    due,
    overpaid: Math.max(0, round2(paid - feeTotal)),
    percentPaid: feeTotal > 0 ? Math.min(100, Math.round((paid / feeTotal) * 100)) : 0,
    installmentAmount,
    installmentsTotal,
    installmentsPaid,
    installmentsLeft: Math.max(0, installmentsTotal - installmentsPaid),
    nextInstallment,
    settled: feeTotal > 0 && due <= 0,
  };
}

/* "2 completed, next on …" — the session counters shown on every patient. */
export function computeProgress(plan = {}, counts = {}, nextSession = null) {
  const planned = Number(plan.totalSessions) || 0;
  const completed = counts.completed || 0;
  const scheduled = counts.scheduled || 0;

  return {
    planned,
    completed,
    scheduled,
    cancelled: counts.cancelled || 0,
    noShow: counts.no_show || 0,
    total: counts.total || 0,
    remaining: planned > 0 ? Math.max(0, planned - completed) : 0,
    percent: planned > 0 ? Math.min(100, Math.round((completed / planned) * 100)) : 0,
    nextSession,
  };
}

/* ------------------------------------------------------------- patients */

/* The browsable list: filtered and paginated, but NOT text-searched. Free-text
   lookup goes through searchPatients() instead, so there is exactly one search
   implementation rather than a weak one here and a good one there. */
export async function listPatients({ status = "", dues = "", page = 1, perPage = 20 } = {}) {
  await connectDB();

  const filter = {};
  if (status) filter.status = status;

  // A balance is derived from the payment ledger, so it can't be expressed as a
  // Mongo filter. When that filter is on, summarise the whole matching set and
  // paginate afterwards — otherwise the page count would lie.
  if (dues) {
    const all = await attachSummaries(await Patient.find(filter).sort({ createdAt: -1 }).lean());
    const matching = all.filter((r) => (dues === "due" ? r.billing.due > 0 : r.billing.due <= 0));

    const total = matching.length;
    const pages = Math.max(1, Math.ceil(total / perPage));
    const current = Math.min(Math.max(1, page), pages);
    const start = (current - 1) * perPage;

    return { rows: plain(matching.slice(start, start + perPage)), total, page: current, pages, perPage };
  }

  const total = await Patient.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, page), pages);

  const patients = await Patient.find(filter)
    .sort({ createdAt: -1 })
    .skip((current - 1) * perPage)
    .limit(perPage)
    .lean();

  return { rows: plain(await attachSummaries(patients)), total, page: current, pages, perPage };
}

/* Adds billing + session counters to a set of patient documents using two
   grouped queries, instead of one query per patient. */
async function attachSummaries(patients) {
  if (!patients.length) return [];
  const ids = patients.map((p) => p._id);

  const [paidRows, statusRows, nextRows] = await Promise.all([
    Payment.aggregate([
      { $match: { patient: { $in: ids } } },
      { $group: { _id: "$patient", paid: { $sum: "$amount" } } },
    ]),
    TreatmentSession.aggregate([
      { $match: { patient: { $in: ids } } },
      { $group: { _id: { patient: "$patient", status: "$status" }, n: { $sum: 1 } } },
    ]),
    TreatmentSession.aggregate([
      { $match: { patient: { $in: ids }, status: "scheduled", scheduledAt: { $gte: new Date() } } },
      { $sort: { scheduledAt: 1 } },
      { $group: { _id: "$patient", scheduledAt: { $first: "$scheduledAt" } } },
    ]),
  ]);

  const paidBy = new Map(paidRows.map((r) => [String(r._id), r.paid]));
  const nextBy = new Map(nextRows.map((r) => [String(r._id), r.scheduledAt]));
  const countsBy = new Map();
  for (const r of statusRows) {
    const key = String(r._id.patient);
    const entry = countsBy.get(key) || { total: 0 };
    entry[r._id.status] = r.n;
    entry.total += r.n;
    countsBy.set(key, entry);
  }

  return patients.map((p) => {
    const key = String(p._id);
    return {
      ...p,
      billing: computeBilling(p.plan, paidBy.get(key) || 0),
      progress: computeProgress(p.plan, countsBy.get(key) || { total: 0 }, nextBy.get(key) || null),
    };
  });
}

/* Patients are addressed by slug in the URL, but API calls carry the immutable
   _id. Both resolve here so either works everywhere. */
export async function findPatientByRef(ref) {
  await connectDB();
  if (!ref) return null;

  const key = String(ref).toLowerCase();
  const bySlug = await Patient.findOne({ slug: key }).lean();
  if (bySlug) return bySlug;

  if (mongoose.isValidObjectId(ref)) return Patient.findById(ref).lean();
  return null;
}

export async function getPatientOverview(ref) {
  await connectDB();

  const patient = await findPatientByRef(ref);
  if (!patient) return null;
  const id = patient._id;

  const [sessions, payments, assessments] = await Promise.all([
    TreatmentSession.find({ patient: id }).sort({ scheduledAt: 1 }).lean(),
    Payment.find({ patient: id }).sort({ paidAt: -1 }).lean(),
    Assessment.find({ patient: id }).sort({ date: -1 }).lean(),
  ]);

  const counts = sessions.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      acc.total += 1;
      return acc;
    },
    { total: 0 }
  );

  const now = Date.now();
  const nextSession =
    sessions.find((s) => s.status === "scheduled" && new Date(s.scheduledAt).getTime() >= now) ||
    null;

  const paid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return plain({
    patient,
    sessions,
    payments,
    assessments,
    billing: computeBilling(patient.plan, paid),
    progress: computeProgress(patient.plan, counts, nextSession?.scheduledAt || null),
  });
}

/* -------------------------------------------------------- SOAP assessments */

export async function createAssessment(patientId, data, userId = null) {
  await connectDB();

  const doc = await Assessment.create({
    patient: patientId,
    session: data.sessionId || null,
    date: data.date ? new Date(data.date) : new Date(),
    chiefComplaint: data.chiefComplaint || "",
    subjective: data.subjective || "",
    objective: {
      painVAS: Number(data.painVAS) || 0,
      rom: Array.isArray(data.rom) ? data.rom : [],
      mmt: Array.isArray(data.mmt) ? data.mmt : [],
      specialTests: Array.isArray(data.specialTests) ? data.specialTests : [],
      postureGaitNotes: data.postureGaitNotes || "",
    },
    assessment: data.assessment || "",
    plan: data.plan || "",
    assessedBy: userId,
  });

  return plain(doc);
}

export async function getPatientAssessments(patientId) {
  await connectDB();
  const rows = await Assessment.find({ patient: patientId }).sort({ date: -1 }).lean();
  return plain(rows);
}

export async function updateAssessment(assessmentId, data) {
  await connectDB();
  const doc = await Assessment.findByIdAndUpdate(
    assessmentId,
    {
      $set: {
        chiefComplaint: data.chiefComplaint,
        subjective: data.subjective,
        objective: {
          painVAS: Number(data.painVAS) || 0,
          rom: Array.isArray(data.rom) ? data.rom : [],
          mmt: Array.isArray(data.mmt) ? data.mmt : [],
          specialTests: Array.isArray(data.specialTests) ? data.specialTests : [],
          postureGaitNotes: data.postureGaitNotes || "",
        },
        assessment: data.assessment,
        plan: data.plan,
        date: data.date ? new Date(data.date) : new Date(),
      },
    },
    { new: true }
  ).lean();
  return plain(doc);
}

export async function deleteAssessment(assessmentId) {
  await connectDB();
  await Assessment.findByIdAndDelete(assessmentId);
  return { success: true };
}


/* ---------------------------------------------------------------- search */

export const SEARCH_MIN_LENGTH = 2;

/* Ranked patient search.

   Every whitespace-separated token must match somewhere (AND, not OR), so
   "meera knee" narrows instead of widening. Matching fields are name, phone,
   email, diagnosis and slug. Results are then scored so the thing you probably
   meant comes first: an exact phone hit beats a name that merely contains the
   token. */
export async function searchPatients(term, { limit = 20 } = {}) {
  await connectDB();

  const query = String(term || "").trim();
  if (query.length < SEARCH_MIN_LENGTH) return { rows: [], term: query, truncated: false };

  const tokens = query.split(/\s+/).filter(Boolean).slice(0, 6);
  const digitsOnly = query.replace(/\D/g, "");

  const conditions = tokens.map((token) => {
    const rx = new RegExp(escapeRegex(token), "i");
    const or = [{ name: rx }, { email: rx }, { diagnosis: rx }, { slug: rx }];

    // Phone is stored as bare digits, so match the token's digits rather than
    // the token itself — "98765-43210" must still find "9876543210".
    const tokenDigits = token.replace(/\D/g, "");
    if (tokenDigits.length >= 3) or.push({ phone: new RegExp(escapeRegex(tokenDigits)) });

    return { $or: or };
  });

  // Over-fetch, score, then trim — cheap at clinic scale, and it lets ranking
  // span the whole candidate set rather than an arbitrary first page.
  const candidates = await Patient.find({ $and: conditions })
    .limit(limit * 4)
    .lean();

  const lowerQuery = query.toLowerCase();

  const scored = candidates
    .map((p) => {
      const name = (p.name || "").toLowerCase();
      const email = (p.email || "").toLowerCase();
      const phone = p.phone || "";
      let score = 0;

      if (digitsOnly.length >= 4) {
        if (phone === digitsOnly) score += 120;
        else if (phone.startsWith(digitsOnly)) score += 90;
        else if (phone.includes(digitsOnly)) score += 60;
      }

      if (name === lowerQuery) score += 100;
      else if (name.startsWith(lowerQuery)) score += 70;
      else if (name.split(/\s+/).some((word) => word.startsWith(lowerQuery))) score += 55;
      else if (name.includes(lowerQuery)) score += 40;

      if (email && email.startsWith(lowerQuery)) score += 30;
      if ((p.diagnosis || "").toLowerCase().includes(lowerQuery)) score += 15;

      // Active cases are usually the ones being looked for.
      if (p.status === "active") score += 5;

      return { patient: p, score };
    })
    .sort((a, b) => b.score - a.score || a.patient.name.localeCompare(b.patient.name));

  const top = scored.slice(0, limit).map((s) => s.patient);

  return {
    rows: plain(await attachSummaries(top)),
    term: query,
    truncated: scored.length > limit,
  };
}

/* ------------------------------------------- schedule & payment ledgers */

export async function listSessions({ range = "upcoming", status = "", page = 1, perPage = 40 } = {}) {
  await connectDB();

  const dayStart = clinicDayStart();
  const dayEnd = new Date(dayStart.getTime() + DAY_MS);

  const filter = {};
  if (status) filter.status = status;

  if (range === "today") filter.scheduledAt = { $gte: dayStart, $lt: dayEnd };
  else if (range === "week")
    filter.scheduledAt = { $gte: dayStart, $lt: new Date(dayStart.getTime() + 7 * DAY_MS) };
  else if (range === "past") filter.scheduledAt = { $lt: dayStart };
  else if (range === "upcoming") filter.scheduledAt = { $gte: dayStart };

  // Past sessions read newest-first; anything forward-looking reads soonest-first.
  const sort = range === "past" ? { scheduledAt: -1 } : { scheduledAt: 1 };

  const total = await TreatmentSession.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, page), pages);

  const rows = await TreatmentSession.find(filter)
    .sort(sort)
    .skip((current - 1) * perPage)
    .limit(perPage)
    .populate("patient", "name slug phone status")
    .lean();

  return { rows: plain(rows), total, page: current, pages };
}

export async function listPayments({ page = 1, perPage = 40 } = {}) {
  await connectDB();

  const monthStart = clinicMonthStart();

  const total = await Payment.countDocuments({});
  const pages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, page), pages);

  const [rows, allTime, thisMonth] = await Promise.all([
    Payment.find({})
      .sort({ paidAt: -1 })
      .skip((current - 1) * perPage)
      .limit(perPage)
      .populate("patient", "name slug phone")
      .lean(),
    Payment.aggregate([{ $group: { _id: null, sum: { $sum: "$amount" } } }]),
    Payment.aggregate([
      { $match: { paidAt: { $gte: monthStart } } },
      { $group: { _id: null, sum: { $sum: "$amount" } } },
    ]),
  ]);

  return {
    rows: plain(rows),
    total,
    page: current,
    pages,
    allTimeTotal: allTime[0]?.sum || 0,
    monthTotal: thisMonth[0]?.sum || 0,
  };
}

/* ------------------------------------------------------------ dashboard */

export async function getDashboard() {
  await connectDB();

  const dayStart = clinicDayStart();
  const dayEnd = new Date(dayStart.getTime() + DAY_MS);
  const weekEnd = new Date(dayStart.getTime() + 7 * DAY_MS);
  const monthStart = clinicMonthStart();

  const [
    patientsTotal,
    patientsActive,
    todaySessions,
    upcoming,
    completedThisMonth,
    collectedThisMonth,
    recentPayments,
    planRows,
    paidRows,
  ] = await Promise.all([
    Patient.countDocuments({}),
    Patient.countDocuments({ status: "active" }),
    TreatmentSession.find({ scheduledAt: { $gte: dayStart, $lt: dayEnd } })
      .sort({ scheduledAt: 1 })
      .populate("patient", "name slug phone")
      .lean(),
    TreatmentSession.find({
      status: "scheduled",
      scheduledAt: { $gte: dayEnd, $lt: weekEnd },
    })
      .sort({ scheduledAt: 1 })
      .limit(10)
      .populate("patient", "name slug phone")
      .lean(),
    TreatmentSession.countDocuments({ status: "completed", scheduledAt: { $gte: monthStart } }),
    Payment.aggregate([
      { $match: { paidAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Payment.find({}).sort({ paidAt: -1 }).limit(8).populate("patient", "name slug").lean(),
    Patient.find({ "plan.feeTotal": { $gt: 0 } }, { plan: 1 }).lean(),
    Payment.aggregate([{ $group: { _id: "$patient", paid: { $sum: "$amount" } } }]),
  ]);

  const paidBy = new Map(paidRows.map((r) => [String(r._id), r.paid]));
  let outstanding = 0;
  let patientsWithDues = 0;
  let installmentsLeft = 0;
  for (const p of planRows) {
    const b = computeBilling(p.plan, paidBy.get(String(p._id)) || 0);
    if (b.due > 0) {
      outstanding += b.due;
      patientsWithDues += 1;
      installmentsLeft += b.installmentsLeft;
    }
  }

  return plain({
    patientsTotal,
    patientsActive,
    todaySessions,
    upcoming,
    completedThisMonth,
    collectedThisMonth: collectedThisMonth[0]?.total || 0,
    recentPayments,
    outstanding: round2(outstanding),
    patientsWithDues,
    installmentsLeft,
  });
}

/* -------------------------------------------------- practice expenses & profit */

export async function listExpenses({ page = 1, perPage = 50 } = {}) {
  await connectDB();
  const total = await Expense.countDocuments({});
  const pages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, page), pages);

  const rows = await Expense.find({})
    .sort({ date: -1 })
    .skip((current - 1) * perPage)
    .limit(perPage)
    .lean();

  return plain({ rows, total, page: current, pages });
}

export async function createExpense(data, userId = null) {
  await connectDB();
  const doc = await Expense.create({
    category: data.category || "other",
    amount: round2(data.amount),
    date: data.date ? new Date(data.date) : new Date(),
    description: data.description || "",
    recordedBy: userId,
  });
  return plain(doc);
}

export async function deleteExpense(id) {
  await connectDB();
  await Expense.findByIdAndDelete(id);
  return { success: true };
}

export async function getProfitabilitySummary() {
  await connectDB();
  const monthStart = clinicMonthStart();

  const [collectedRes, expenseRes, categoryBreakdown] = await Promise.all([
    Payment.aggregate([
      { $match: { paidAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Expense.aggregate([
      { $match: { date: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Expense.aggregate([
      { $match: { date: { $gte: monthStart } } },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
    ]),
  ]);

  const revenueThisMonth = round2(collectedRes[0]?.total || 0);
  const expensesThisMonth = round2(expenseRes[0]?.total || 0);
  const netIncomeThisMonth = round2(revenueThisMonth - expensesThisMonth);

  return plain({
    revenueThisMonth,
    expensesThisMonth,
    netIncomeThisMonth,
    categoryBreakdown: categoryBreakdown.map((c) => ({
      category: c._id,
      total: round2(c.total),
    })),
  });
}

/* ------------------------------------------------- clinic hours & identity */

/* One settings row, created on first read so the rest of the code never has to
   handle "not configured yet". Always returned through withDefaults(), so a row
   written before a field existed still answers for it. */
export async function getClinicSettings() {
  await connectDB();
  const row = await ClinicSettings.findOne({ key: "clinic" }).lean();
  return plain(withDefaults(row || {}));
}

export async function saveClinicSettings(values) {
  await connectDB();
  const row = await ClinicSettings.findOneAndUpdate(
    { key: "clinic" },
    { $set: { ...values, key: "clinic" } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  return plain(withDefaults(row));
}

/* --------------------------------------------------- double-booking guard */

// The longest a session may be, per LIMITS.durationMax. Anything starting more
// than this before a candidate slot has certainly finished before it begins,
// which is what bounds the query window.
const MAX_SESSION_MIN = 480;

/* Sessions that would occupy the same therapist at the same time.

   Cancellations and no-shows free the slot; two differently-named therapists
   can run in parallel. A session with no therapist recorded is treated as
   colliding with everything, because there is nothing to tell it apart. */
export async function findSessionConflicts({
  scheduledAt,
  durationMin = 45,
  therapist = "",
  excludeId = null,
} = {}) {
  await connectDB();

  const start = new Date(scheduledAt);
  if (Number.isNaN(start.getTime())) return [];

  const length = Number(durationMin) || 45;
  const endMs = start.getTime() + length * 60000;

  const filter = {
    status: { $in: ["scheduled", "completed"] },
    scheduledAt: {
      $gt: new Date(start.getTime() - MAX_SESSION_MIN * 60000),
      $lt: new Date(endMs),
    },
  };
  if (excludeId && mongoose.isValidObjectId(excludeId)) filter._id = { $ne: excludeId };

  const nearby = await TreatmentSession.find(filter)
    .populate("patient", "name slug phone")
    .lean();

  const mine = String(therapist || "").trim().toLowerCase();

  const clashes = nearby.filter((s) => {
    const otherStart = new Date(s.scheduledAt).getTime();
    const otherEnd = otherStart + (Number(s.durationMin) || 45) * 60000;
    if (otherStart >= endMs || otherEnd <= start.getTime()) return false;

    const theirs = String(s.therapist || "").trim().toLowerCase();
    if (!mine || !theirs) return true;
    return mine === theirs;
  });

  return plain(clashes);
}

/* ---------------------------------------------------------- bulk booking */

/* Creates a run of sessions from pre-generated occurrences (see
   lib/recurrence.js). Conflicting slots are skipped and reported rather than
   aborting the whole run — losing one Wednesday should not cost you the other
   eleven appointments. */
export async function createSessionsBulk(patientId, occurrences, base = {}) {
  await connectDB();

  const last = await TreatmentSession.findOne({ patient: patientId }, { number: 1 })
    .sort({ number: -1 })
    .lean();

  let number = (last?.number || 0) + 1;
  const created = [];
  const skipped = [];

  for (const occurrence of occurrences) {
    const scheduledAt = new Date(occurrence.scheduledAt);

    const conflicts = await findSessionConflicts({
      scheduledAt,
      durationMin: base.durationMin,
      therapist: base.therapist,
    });

    if (conflicts.length) {
      skipped.push({
        label: occurrence.label,
        time: occurrence.time,
        reason: `Clashes with ${conflicts[0].patient?.name || "another booking"}`,
      });
      continue;
    }

    const doc = await TreatmentSession.create({
      ...base,
      patient: patientId,
      number,
      scheduledAt,
      status: "scheduled",
    });

    created.push(plain(doc));
    number += 1;
  }

  return { created, skipped };
}

/* ------------------------------------------------------------- calendar */

/* Every session in a window, bucketed by clinic-time calendar date. Days with
   nothing booked come back as empty arrays rather than missing keys, so the
   grid always has a column for each day it is meant to draw. */
export async function getCalendarDays({ startKey, days = 7 } = {}) {
  await connectDB();

  const from = new Date(instantAt(startKey, "00:00"));
  const to = new Date(instantAt(addDays(startKey, days), "00:00"));

  const rows = await TreatmentSession.find({ scheduledAt: { $gte: from, $lt: to } })
    .sort({ scheduledAt: 1 })
    .populate("patient", "name slug phone")
    .lean();

  const byDay = Object.fromEntries(rangeOfKeys(startKey, days).map((key) => [key, []]));
  for (const row of rows) {
    const key = dateKeyOf(row.scheduledAt);
    if (byDay[key]) byDay[key].push(row);
  }

  return plain({ startKey, days, byDay, total: rows.length });
}

/* The day's home visits in the order they have to be driven — which is simply
   appointment order, since that is what was promised to the patients. */
export async function getHomeVisits(dateKey) {
  await connectDB();

  const from = new Date(instantAt(dateKey, "00:00"));
  const to = new Date(instantAt(addDays(dateKey, 1), "00:00"));

  const rows = await TreatmentSession.find({
    visitType: "home",
    scheduledAt: { $gte: from, $lt: to },
    status: { $in: ["scheduled", "completed"] },
  })
    .sort({ scheduledAt: 1 })
    .populate("patient", "name slug phone address city")
    .lean();

  const travelTotal = rows.reduce((sum, r) => sum + (Number(r.travelFee) || 0), 0);

  return plain({ dateKey, rows, travelTotal: round2(travelTotal) });
}

/* ------------------------------------------------------ package catalogue */

export async function listPackages({ includeInactive = false } = {}) {
  await connectDB();
  const filter = includeInactive ? {} : { active: true };
  const rows = await TreatmentPackage.find(filter).sort({ active: -1, name: 1 }).lean();
  return plain(rows);
}

export async function createPackage(values, userId = null) {
  await connectDB();
  const doc = await TreatmentPackage.create({ ...values, createdBy: userId });
  return plain(doc);
}

export async function updatePackage(id, values) {
  await connectDB();
  const doc = await TreatmentPackage.findByIdAndUpdate(id, { $set: values }, { new: true }).lean();
  return doc ? plain(doc) : null;
}

export async function deletePackage(id) {
  await connectDB();
  const doc = await TreatmentPackage.findByIdAndDelete(id);
  return Boolean(doc);
}

/* ------------------------------------------------------ receipt numbers */

/* Gapless, per financial year, and handed out by a single atomic $inc — two
   payments recorded in the same second cannot come away with the same number.

   Note the consequence of using a counter: a deleted payment leaves a gap. That
   is the correct behaviour for a receipt book. */
export async function nextReceiptNo(paidAt = new Date(), prefix = "PC") {
  await connectDB();

  const fy = financialYearOf(paidAt);
  const counter = await Counter.findByIdAndUpdate(
    `receipt:${fy}`,
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  ).lean();

  return formatReceiptNo(prefix, fy, counter.seq);
}

/* ----------------------------------------------------- dropout & recall */

/* Patients who have drifted: nothing booked ahead, nothing attended recently,
   and still something outstanding — sessions they have already paid for, or
   money still owed. These are the cheapest appointments in the clinic to win
   back, which is the whole reason this list exists. */
export async function getRecallList({ days = 30 } = {}) {
  await connectDB();

  const cutoff = new Date(Date.now() - days * DAY_MS);

  const patients = await Patient.find({ status: { $in: ["active", "on_hold"] } })
    .sort({ createdAt: -1 })
    .lean();

  const withSummaries = await attachSummaries(patients);
  if (!withSummaries.length) return plain({ rows: [], days });

  const lastRows = await TreatmentSession.aggregate([
    { $match: { patient: { $in: patients.map((p) => p._id) }, status: "completed" } },
    { $group: { _id: "$patient", last: { $max: "$scheduledAt" } } },
  ]);
  const lastBy = new Map(lastRows.map((r) => [String(r._id), r.last]));

  const rows = withSummaries
    .map((p) => ({ ...p, lastVisitAt: lastBy.get(String(p._id)) || null }))
    .filter((p) => {
      // Already coming back — not a dropout.
      if (p.progress.nextSession) return false;
      // Never treated and only just registered: too early to chase.
      const since = p.lastVisitAt || p.createdAt;
      if (new Date(since) > cutoff) return false;

      return p.progress.remaining > 0 || p.billing.due > 0 || p.progress.completed > 0;
    })
    .map((p) => ({
      ...p,
      recallReason:
        p.progress.remaining > 0
          ? `${p.progress.remaining} paid session${p.progress.remaining === 1 ? "" : "s"} unused`
          : p.billing.due > 0
            ? "Balance outstanding"
            : "No follow-up booked",
    }))
    .sort((a, b) => new Date(a.lastVisitAt || a.createdAt) - new Date(b.lastVisitAt || b.createdAt));

  return plain({ rows, days });
}

/* --------------------------------------------------- profit and loss */

/* The keys of the last N clinic months, oldest first: ["2025-09", …, "2026-08"]. */
function monthKeys(months) {
  return Array.from({ length: months }, (_, i) => toDateInput(clinicMonthsAgo(months - 1 - i)).slice(0, 7));
}

/* Revenue, expenses and net for each of the last N months.

   Grouped by the clinic's own month via $dateToString with a timezone, so a
   payment taken at 11pm on the 31st stays in that month rather than sliding
   into the next one on a UTC host. */
export async function getProfitAndLoss({ months = 12 } = {}) {
  await connectDB();

  const keys = monthKeys(months);
  const from = new Date(`${keys[0]}-01T00:00:00+05:30`);

  const groupByMonth = (dateField) => [
    { $match: { [dateField]: { $gte: from } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: `$${dateField}`, timezone: CLINIC_TZ } },
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ];

  const [payRows, expRows, catRows] = await Promise.all([
    Payment.aggregate(groupByMonth("paidAt")),
    Expense.aggregate(groupByMonth("date")),
    Expense.aggregate([
      { $match: { date: { $gte: from } } },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
      { $sort: { total: -1 } },
    ]),
  ]);

  const revenueBy = new Map(payRows.map((r) => [r._id, r.total]));
  const expenseBy = new Map(expRows.map((r) => [r._id, r.total]));

  const rows = keys.map((key) => {
    const revenue = round2(revenueBy.get(key) || 0);
    const expenses = round2(expenseBy.get(key) || 0);
    return { key, revenue, expenses, net: round2(revenue - expenses) };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      revenue: round2(acc.revenue + r.revenue),
      expenses: round2(acc.expenses + r.expenses),
      net: round2(acc.net + r.net),
    }),
    { revenue: 0, expenses: 0, net: 0 }
  );

  const bestMonth = rows.reduce((best, r) => (best && best.net >= r.net ? best : r), null);

  return plain({
    months,
    rows,
    totals,
    bestMonth,
    // A margin is only meaningful once something was actually collected.
    marginPercent: totals.revenue > 0 ? Math.round((totals.net / totals.revenue) * 100) : 0,
    categoryBreakdown: catRows.map((c) => ({ category: c._id, total: round2(c.total) })),
  });
}

/* ------------------------------------------------------- reviews & testimonials */

export async function listApprovedReviews() {
  await connectDB();
  const reviews = await Review.find({ status: "approved" }).sort({ createdAt: -1 }).lean();
  return plain(reviews);
}

export async function listReviewsAdmin() {
  await connectDB();
  const reviews = await Review.find({}).sort({ createdAt: -1 }).lean();
  return plain(reviews);
}

export async function createReview(data) {
  await connectDB();
  const doc = await Review.create({
    name: data.name,
    rating: Number(data.rating) || 5,
    role: data.role || "Patient",
    text: data.text,
    status: "pending",
    featured: false,
  });
  return plain(doc);
}

export async function updateReviewStatus(id, { status, featured }) {
  await connectDB();
  const update = {};
  if (status) update.status = status;
  if (typeof featured === "boolean") update.featured = featured;

  const doc = await Review.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
  return plain(doc);
}

export async function deleteReview(id) {
  await connectDB();
  await Review.findByIdAndDelete(id);
  return { success: true };
}

/* -------------------------------------------------------- instagram feed */

/* The homepage wall. Falls back to the curated defaults when nothing has been
   added yet, so a fresh install never renders an empty section. */
export async function listInstagramPosts({ includeInactive = false, limit = 8 } = {}) {
  await connectDB();
  const filter = includeInactive ? {} : { active: true };
  const rows = await InstagramPost.find(filter)
    .sort({ order: 1, createdAt: -1 })
    .limit(includeInactive ? 200 : limit)
    .lean();
  return plain(rows);
}

export async function createInstagramPost({ shortcode, label = "" }, userId = null) {
  await connectDB();
  // New posts go to the front — the newest post is the one worth showing first.
  const first = await InstagramPost.findOne({}, { order: 1 }).sort({ order: 1 }).lean();
  const doc = await InstagramPost.create({
    shortcode,
    label,
    order: (first?.order || 0) - 1,
    addedBy: userId,
  });
  return plain(doc);
}

export async function updateInstagramPost(id, values) {
  await connectDB();
  const doc = await InstagramPost.findByIdAndUpdate(id, { $set: values }, { new: true }).lean();
  return doc ? plain(doc) : null;
}

export async function deleteInstagramPost(id) {
  await connectDB();
  return Boolean(await InstagramPost.findByIdAndDelete(id));
}

/* ----------------------------------------------------------- services CMS */

export async function listServicesCMS() {
  await connectDB();
  const rows = await ServiceContent.find({}).lean();
  return plain(rows);
}

export async function updateServiceCMS(slug, data) {
  await connectDB();
  const doc = await ServiceContent.findOneAndUpdate(
    { slug },
    { $set: data },
    { upsert: true, new: true }
  ).lean();
  return plain(doc);
}

