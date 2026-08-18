import Link from "next/link";
import { getClinicSettings, getDashboard, getRecallList } from "@/lib/clinic";
import { formatMoney, formatDateTime, formatTime } from "@/lib/format";
import { sessionReminderText } from "@/lib/whatsapp";
import WhatsAppButton from "@/components/admin/WhatsAppButton";
import {
  Alert,
  Card,
  Empty,
  PageHeader,
  SessionBadge,
  Stat,
} from "@/components/admin/ui";

export const metadata = { title: "Dashboard — Physio Castle Admin" };

export default async function AdminDashboard({ searchParams }) {
  const [d, settings, recall] = await Promise.all([
    getDashboard(),
    getClinicSettings(),
    getRecallList({ days: 30 }),
  ]);
  const denied = searchParams?.denied === "1";

  const homeVisitsToday = d.todaySessions.filter((s) => s.visitType === "home").length;

  return (
    <>
      <PageHeader eyebrow="Overview" title="Dashboard">
        <Link href="/admin/patients/new" className="adm-btn adm-btn-primary">
          + New patient
        </Link>
      </PageHeader>

      <div className="adm-body">
        {denied ? (
          <Alert tone="error" message="You don't have permission to open that page." />
        ) : null}

        <div className="adm-grid cols-4">
          <Stat
            label="Active patients"
            value={d.patientsActive}
            hint={`${d.patientsTotal} on file in total`}
          />
          <Stat
            label="Sessions today"
            value={d.todaySessions.length}
            hint={`${d.completedThisMonth} completed this month`}
          />
          <Stat
            label="Outstanding dues"
            value={formatMoney(d.outstanding)}
            tone={d.outstanding > 0 ? "danger" : "good"}
            hint={
              d.patientsWithDues
                ? `${d.patientsWithDues} patient${d.patientsWithDues === 1 ? "" : "s"} · ${d.installmentsLeft} instalment${d.installmentsLeft === 1 ? "" : "s"} left`
                : "Everything settled"
            }
          />
          <Stat
            label="Collected this month"
            value={formatMoney(d.collectedThisMonth)}
            tone="good"
            hint="Payments recorded since the 1st"
          />
        </div>

        {recall.rows.length ? (
          <Alert
            tone="warn"
            message={`${recall.rows.length} patient${recall.rows.length === 1 ? " has" : "s have"} not been seen in 30 days and have nothing booked.`}
          />
        ) : null}

        <div className="adm-split">
          <Card
            title="Today's sessions"
            subtitle={
              homeVisitsToday
                ? `Everything scheduled for today · ${homeVisitsToday} home visit${homeVisitsToday === 1 ? "" : "s"}`
                : "Everything scheduled for today"
            }
            tight
            action={
              homeVisitsToday ? (
                <Link href="/admin/schedule?view=route" className="adm-btn adm-btn-ghost adm-btn-sm">
                  ⌂ Route
                </Link>
              ) : null
            }
          >
            {d.todaySessions.length === 0 ? (
              <Empty icon="◔" title="Nothing scheduled today" hint="Add a session from a patient's page." />
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Patient</th>
                      <th>Visit</th>
                      <th>Status</th>
                      <th className="shrink" />
                    </tr>
                  </thead>
                  <tbody>
                    {d.todaySessions.map((s) => (
                      <tr key={s._id}>
                        <td className="adm-mono">{formatTime(s.scheduledAt)}</td>
                        <td>
                          {s.patient ? (
                            <Link href={`/admin/patients/${s.patient.slug || s.patient._id}`} className="adm-table-name">
                              {s.patient.name}
                            </Link>
                          ) : (
                            <span className="adm-muted">Deleted patient</span>
                          )}
                          <div className="adm-table-sub">{s.patient?.phone}</div>
                        </td>
                        <td className="adm-mono">
                          #{s.number}
                          {s.visitType === "home" ? <div className="adm-table-sub">⌂ Home</div> : null}
                        </td>
                        <td>
                          <SessionBadge status={s.status} />
                        </td>
                        <td className="shrink">
                          {s.status === "scheduled" && s.patient ? (
                            <WhatsAppButton
                              phone={s.patient.phone}
                              message={sessionReminderText({
                                patientName: s.patient.name,
                                session: s,
                                clinicName: settings.clinicName,
                                therapistName: s.therapist || settings.therapistName,
                              })}
                              label="Remind"
                            />
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card
            title="Coming up"
            subtitle="Next 7 days"
            tight
            action={
              <Link href="/admin/schedule" className="adm-btn adm-btn-ghost adm-btn-sm">
                Full schedule
              </Link>
            }
          >
            {d.upcoming.length === 0 ? (
              <Empty icon="·" title="No upcoming sessions" />
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <tbody>
                    {d.upcoming.map((s) => (
                      <tr key={s._id}>
                        <td>
                          {s.patient ? (
                            <Link href={`/admin/patients/${s.patient.slug || s.patient._id}`} className="adm-table-name">
                              {s.patient.name}
                            </Link>
                          ) : (
                            <span className="adm-muted">Deleted patient</span>
                          )}
                          <div className="adm-table-sub">{formatDateTime(s.scheduledAt)}</div>
                        </td>
                        <td className="num adm-mono">#{s.number}</td>
                        <td className="shrink">
                          {s.patient ? (
                            <WhatsAppButton
                              phone={s.patient.phone}
                              message={sessionReminderText({
                                patientName: s.patient.name,
                                session: s,
                                clinicName: settings.clinicName,
                                therapistName: s.therapist || settings.therapistName,
                              })}
                              label="Remind"
                            />
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <Card
          title="Recent payments"
          subtitle="Latest amounts recorded against a patient"
          tight
          action={
            <Link href="/admin/payments" className="adm-btn adm-btn-ghost adm-btn-sm">
              All payments
            </Link>
          }
        >
          {d.recentPayments.length === 0 ? (
            <Empty icon="₹" title="No payments recorded yet" />
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Method</th>
                    <th>Date</th>
                    <th className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {d.recentPayments.map((p) => (
                    <tr key={p._id}>
                      <td>
                        {p.patient ? (
                          <Link href={`/admin/patients/${p.patient.slug || p.patient._id}`} className="adm-table-name">
                            {p.patient.name}
                          </Link>
                        ) : (
                          <span className="adm-muted">Deleted patient</span>
                        )}
                      </td>
                      <td className="adm-muted">{p.method.replace("_", " ")}</td>
                      <td className="adm-muted adm-small">{formatDateTime(p.paidAt)}</td>
                      <td className="num adm-mono">{formatMoney(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
