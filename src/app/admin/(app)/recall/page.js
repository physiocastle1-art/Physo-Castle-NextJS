import Link from "next/link";
import { getClinicSettings, getRecallList } from "@/lib/clinic";
import { formatDate, formatMoney } from "@/lib/format";
import { formatPhone } from "@/lib/validation";
import { recallText } from "@/lib/whatsapp";
import { Card, Empty, PageHeader, PatientBadge, Stat } from "@/components/admin/ui";
import WhatsAppButton from "@/components/admin/WhatsAppButton";

export const metadata = { title: "Recall list — Physio Castle Admin" };

const WINDOWS = [14, 30, 60, 90];

/* The patients who quietly stopped coming.

   They already chose this clinic, already have a plan, and in many cases have
   already paid for sessions they never used. Reaching them costs one WhatsApp
   message, which makes this the cheapest appointment in the building. */
export default async function RecallPage({ searchParams }) {
  const days = WINDOWS.includes(Number(searchParams?.days)) ? Number(searchParams.days) : 30;

  const [{ rows }, settings] = await Promise.all([getRecallList({ days }), getClinicSettings()]);

  const unusedSessions = rows.reduce((sum, r) => sum + r.progress.remaining, 0);
  const outstanding = rows.reduce((sum, r) => sum + r.billing.due, 0);

  return (
    <>
      <PageHeader eyebrow="Follow-up" title="Recall list">
        <div className="adm-inline">
          {WINDOWS.map((w) => (
            <Link
              key={w}
              href={`/admin/recall?days=${w}`}
              className={`adm-btn adm-btn-sm ${days === w ? "adm-btn-primary" : "adm-btn-ghost"}`}
            >
              {w} days
            </Link>
          ))}
        </div>
      </PageHeader>

      <div className="adm-body">
        <div className="adm-grid cols-3">
          <Stat
            label="Patients to chase"
            value={rows.length}
            tone={rows.length > 0 ? "danger" : "good"}
            hint={`No visit in ${days} days, nothing booked ahead`}
          />
          <Stat
            label="Paid sessions unused"
            value={unusedSessions}
            hint="Already paid for and never delivered"
          />
          <Stat
            label="Money outstanding"
            value={formatMoney(outstanding)}
            tone={outstanding > 0 ? "danger" : "good"}
            hint="Across these patients"
          />
        </div>

        <Card
          title={`${rows.length} patient${rows.length === 1 ? "" : "s"} have drifted`}
          subtitle="Active or on-hold patients with no future appointment and no recent visit. Oldest first."
          tight
        >
          {rows.length === 0 ? (
            <Empty
              icon="✓"
              title="Nobody has drifted"
              hint={`Every active patient has either been seen in the last ${days} days or has a session booked.`}
            />
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Last visit</th>
                    <th>Why</th>
                    <th className="num">Sessions</th>
                    <th className="num">Due</th>
                    <th className="shrink" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p._id}>
                      <td>
                        <Link href={`/admin/patients/${p.slug}`} className="adm-table-name">
                          {p.name}
                        </Link>
                        <div className="adm-table-sub">
                          {formatPhone(p.phone)}
                          {p.diagnosis ? ` · ${p.diagnosis}` : ""}
                        </div>
                      </td>
                      <td className="adm-small">
                        {p.lastVisitAt ? formatDate(p.lastVisitAt) : <span className="adm-muted">Never attended</span>}
                        <div className="adm-table-sub">
                          <PatientBadge status={p.status} />
                        </div>
                      </td>
                      <td className="adm-small adm-muted">{p.recallReason}</td>
                      <td className="num adm-mono">
                        {p.progress.completed}
                        {p.progress.planned > 0 ? ` / ${p.progress.planned}` : ""}
                      </td>
                      <td className="num adm-mono" style={p.billing.due > 0 ? { color: "var(--adm-red)" } : undefined}>
                        {formatMoney(p.billing.due)}
                      </td>
                      <td className="shrink">
                        <div className="adm-row-actions">
                          <a href={`tel:+91${p.phone}`} className="adm-btn adm-btn-ghost adm-btn-sm">
                            Call
                          </a>
                          <WhatsAppButton
                            phone={p.phone}
                            message={recallText({
                              patientName: p.name,
                              lastVisitAt: p.lastVisitAt,
                              sessionsLeft: p.progress.remaining,
                              clinicName: settings.clinicName,
                            })}
                            label="Check in"
                            title="Send a warm check-in message on WhatsApp"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <p className="adm-small adm-muted">
          The message deliberately asks how they are rather than mentioning money, even for patients
          who owe — the aim is the next appointment, and the balance comes with it.
        </p>
      </div>
    </>
  );
}
