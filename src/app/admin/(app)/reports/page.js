import Link from "next/link";
import { getReports } from "@/lib/reports";
import { formatMoney, formatMonthKey } from "@/lib/format";
import { Card, Empty, PageHeader, Stat } from "@/components/admin/ui";
import { BarChart, ChartLegend, RatioBar, CHART_COLORS } from "@/components/admin/Charts";
import PrintButton from "@/components/admin/PrintButton";

export const metadata = { title: "Reports — Physio Castle Admin" };

/* Amounts on a chart axis want to be short. ₹1,20,000 becomes ₹1.2L. */
const shortMoney = (n) => {
  const v = Number(n) || 0;
  const abs = Math.abs(v);
  if (abs >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `₹${Math.round(v / 1000)}k`;
  return `₹${Math.round(v)}`;
};

const sessionCount = (n) => `${n} session${n === 1 ? "" : "s"}`;

export default async function ReportsPage({ searchParams }) {
  const months = Math.min(24, Math.max(3, Number(searchParams?.months) || 12));
  const report = await getReports({ months });

  const { pnl, growth, revenue, referrals, diagnoses, attendance, worstAttenders, outcomes } = report;

  return (
    <>
      <PageHeader eyebrow="Practice" title="Reports">
        <div className="adm-inline">
          {[6, 12, 24].map((m) => (
            <Link
              key={m}
              href={`/admin/reports?months=${m}`}
              className={`adm-btn adm-btn-sm ${months === m ? "adm-btn-primary" : "adm-btn-ghost"}`}
            >
              {m} months
            </Link>
          ))}
          <PrintButton label="Print" className="adm-btn adm-btn-ghost adm-btn-sm no-print" />
        </div>
      </PageHeader>

      <div className="adm-body">
        <div className="adm-grid cols-4">
          <Stat
            label={`Collected (${months} months)`}
            value={formatMoney(pnl.totals.revenue)}
            tone="good"
            hint={`${formatMoney(pnl.totals.expenses)} spent · ${pnl.marginPercent}% margin`}
          />
          <Stat
            label="Revenue per patient"
            value={formatMoney(revenue.perPatient)}
            hint={`${revenue.payingPatients} patients have paid something`}
          />
          <Stat
            label="Still outstanding"
            value={formatMoney(revenue.outstanding)}
            tone={revenue.outstanding > 0 ? "danger" : "good"}
            hint="Across every patient with a fee set"
          />
          <Stat
            label="Sessions kept"
            value={`${attendance.keptRate}%`}
            tone={attendance.noShowRate > 10 ? "danger" : "good"}
            hint={`${attendance.noShowRate}% no-show · ${attendance.cancelRate}% cancelled`}
          />
        </div>

        {/* ---------------------------------------------------- money */}

        <Card
          title="Revenue and expenses by month"
          subtitle="What came in, what went out, and what was left — collected amounts, not billed."
        >
          <BarChart
            rows={pnl.rows}
            bars={[
              { key: "revenue", label: "Collected", color: CHART_COLORS.revenue },
              { key: "expenses", label: "Expenses", color: CHART_COLORS.expenses },
              { key: "net", label: "Net", color: CHART_COLORS.net },
            ]}
            formatValue={shortMoney}
            formatRow={(row) => formatMonthKey(row.key).replace(" ", " ")}
          />
          <ChartLegend
            items={[
              { label: "Collected", color: CHART_COLORS.revenue },
              { label: "Expenses", color: CHART_COLORS.expenses },
              { label: "Net", color: CHART_COLORS.net },
            ]}
          />
          {pnl.bestMonth ? (
            <p className="adm-chart-note">
              Best month: {formatMonthKey(pnl.bestMonth.key)} at {formatMoney(pnl.bestMonth.net)} net.
            </p>
          ) : null}
        </Card>

        <div className="adm-split">
          <Card title="Top patients by revenue" subtitle="Who the practice actually runs on" tight>
            {revenue.topPatients.length === 0 ? (
              <Empty icon="₹" title="No payments recorded yet" />
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th className="num">Sessions</th>
                      <th className="num">Paid</th>
                      <th className="num">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenue.topPatients.map((p) => (
                      <tr key={p._id}>
                        <td>
                          <Link href={`/admin/patients/${p.slug}`} className="adm-table-name">
                            {p.name}
                          </Link>
                        </td>
                        <td className="num adm-mono">{p.completed}</td>
                        <td className="num adm-mono">{formatMoney(p.paid)}</td>
                        <td className="num adm-mono" style={p.due > 0 ? { color: "var(--adm-red)" } : undefined}>
                          {formatMoney(p.due)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card
            title="Where patients come from"
            subtitle="Aggregated from the “referred by” on each record"
            tight
          >
            {referrals.length === 0 ? (
              <Empty
                icon="↗"
                title="No referral sources recorded"
                hint="Fill in “Referred by” when adding a patient and this becomes your marketing report."
              />
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th className="num">Patients</th>
                      <th className="num">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((r) => (
                      <tr key={r.label}>
                        <td>{r.label}</td>
                        <td className="num adm-mono">{r.count}</td>
                        <td className="num adm-mono">{formatMoney(r.revenue)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="adm-muted">Walk-in / not recorded</td>
                      <td className="num adm-mono adm-muted">{report.selfReferred}</td>
                      <td className="num adm-muted">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* ------------------------------------------------- clinical */}

        <div className="adm-split">
          <Card title="What the clinic treats" subtitle="Top diagnoses across every record" tight>
            {diagnoses.length === 0 ? (
              <Empty icon="✚" title="No diagnoses recorded yet" />
            ) : (
              <div className="adm-card-body">
                <div className="adm-stack">
                  {diagnoses.map((d) => (
                    <RatioBar
                      key={d.label}
                      label={d.label}
                      value={d.count}
                      total={diagnoses[0].count}
                      formatValue={(v) => `${v} (${d.share}%)`}
                    />
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card title="How courses of treatment end" subtitle="Delivery, not billing">
            <dl className="adm-dl">
              <div className="adm-dl-item">
                <dt>Patients on the books</dt>
                <dd className="adm-mono">{outcomes.patientsTotal}</dd>
              </div>
              <div className="adm-dl-item">
                <dt>Discharged</dt>
                <dd className="adm-mono">{outcomes.discharged}</dd>
              </div>
              <div className="adm-dl-item">
                <dt>Average sessions to discharge</dt>
                <dd className="adm-mono">{outcomes.avgSessionsToDischarge || "—"}</dd>
              </div>
              <div className="adm-dl-item">
                <dt>Packages completed</dt>
                <dd className="adm-mono">
                  {outcomes.finished} of {outcomes.withPlan} ({outcomes.rate}%)
                </dd>
              </div>
              <div className="adm-dl-item">
                <dt>Sessions sold but unused</dt>
                <dd className="adm-mono">{outcomes.unusedSessions}</dd>
              </div>
            </dl>
            <p className="adm-chart-note">
              Unused sessions are already paid for. They are the backlog you owe, and the reason the{" "}
              <Link href="/admin/recall">recall list</Link> exists.
            </p>
          </Card>
        </div>

        {/* ---------------------------------------------- attendance */}

        <Card
          title="Attendance"
          subtitle={`${attendance.settled} sessions with a known outcome — bookings still in the future are excluded`}
        >
          <div className="adm-grid cols-3">
            <Stat label="Kept" value={`${attendance.keptRate}%`} tone="good" hint={sessionCount(attendance.completed)} />
            <Stat
              label="Cancelled"
              value={`${attendance.cancelRate}%`}
              hint={sessionCount(attendance.cancelled)}
            />
            <Stat
              label="No-show"
              value={`${attendance.noShowRate}%`}
              tone={attendance.noShowRate > 10 ? "danger" : ""}
              hint={sessionCount(attendance.noShow)}
            />
          </div>

          {worstAttenders.length ? (
            <div className="adm-table-wrap" style={{ marginTop: 16 }}>
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th className="num">Sessions</th>
                    <th className="num">Cancelled</th>
                    <th className="num">No-show</th>
                    <th className="num">Missed</th>
                  </tr>
                </thead>
                <tbody>
                  {worstAttenders.map((p) => (
                    <tr key={p._id}>
                      <td>
                        <Link href={`/admin/patients/${p.slug}`} className="adm-table-name">
                          {p.name}
                        </Link>
                      </td>
                      <td className="num adm-mono">{p.decided}</td>
                      <td className="num adm-mono">{p.cancelled}</td>
                      <td className="num adm-mono">{p.noShow}</td>
                      <td className="num adm-mono" style={{ color: "var(--adm-red)" }}>
                        {p.rate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="adm-chart-note">
              Nobody has missed enough sessions to show a pattern — a patient needs at least three
              settled bookings before a rate means anything.
            </p>
          )}
        </Card>

        {/* -------------------------------------------------- growth */}

        <Card title="New and returning patients" subtitle="Registrations, and people who came back">
          <BarChart
            rows={growth}
            bars={[
              { key: "added", label: "New", color: CHART_COLORS.added },
              { key: "returning", label: "Returning", color: CHART_COLORS.returning },
            ]}
            formatValue={(v) => String(Math.round(v))}
            formatRow={(row) => formatMonthKey(row.key).replace(" ", " ")}
          />
          <ChartLegend
            items={[
              { label: "New registrations", color: CHART_COLORS.added },
              { label: "Returning patients", color: CHART_COLORS.returning },
            ]}
          />
          <p className="adm-chart-note">
            “Returning” counts each patient once per month they attended a session, provided they were
            already registered before that month began.
          </p>
        </Card>
      </div>
    </>
  );
}
