import Link from "next/link";
import { listPatients } from "@/lib/clinic";
import { formatMoney, formatDateTime } from "@/lib/format";
import { formatPhone } from "@/lib/validation";
import PatientFilters from "@/components/admin/PatientFilters";
import PatientSearch from "@/components/admin/PatientSearch";
import { Card, Empty, Meter, PageHeader, PatientBadge } from "@/components/admin/ui";

export const metadata = { title: "Patients — Physio Castle Admin" };

export default async function PatientsPage({ searchParams }) {
  const status = searchParams?.status || "";
  const dues = searchParams?.dues || "";
  const page = Number(searchParams?.page) || 1;

  const { rows, total, pages, page: current } = await listPatients({ status, dues, page });

  const pageLink = (n) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (dues) params.set("dues", dues);
    if (n > 1) params.set("page", String(n));
    return `/admin/patients${params.size ? `?${params}` : ""}`;
  };

  return (
    <>
      <PageHeader eyebrow="Records" title="Patients">
        <Link href="/admin/patients/new" className="adm-btn adm-btn-primary">
          + New patient
        </Link>
      </PageHeader>

      <div className="adm-body">
        <Card title="Find a patient" subtitle="Type a name, mobile number or diagnosis — results appear as you type.">
          <PatientSearch />
        </Card>

        <Card title="Browse" subtitle="Filters apply to the list below.">
          <PatientFilters status={status} dues={dues} />
        </Card>

        <Card
          title={`${total} patient${total === 1 ? "" : "s"}`}
          subtitle={dues ? "Balances are calculated from the recorded payments." : undefined}
          tight
        >
          {rows.length === 0 ? (
            <Empty
              icon="☰"
              title="No patients here"
              hint={status || dues ? "Try clearing the filters." : "Add your first patient to get started."}
            />
          ) : (
            <>
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Status</th>
                      <th>Sessions</th>
                      <th>Next session</th>
                      <th className="num">Fee</th>
                      <th className="num">Paid</th>
                      <th className="num">Balance</th>
                      <th>Instalments</th>
                      <th className="shrink">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => (
                      <tr key={p._id}>
                        <td>
                          <Link href={`/admin/patients/${p.slug || p._id}`} className="adm-table-name">
                            {p.name}
                          </Link>
                          <div className="adm-table-sub">
                            {formatPhone(p.phone)}
                            {p.age ? ` · ${p.age}y` : ""}
                          </div>
                        </td>
                        <td>
                          <PatientBadge status={p.status} />
                        </td>
                        <td style={{ minWidth: 130 }}>
                          <span className="adm-small">
                            <strong>{p.progress.completed}</strong>
                            {p.progress.planned > 0 ? ` of ${p.progress.planned}` : ""} done
                          </span>
                          {p.progress.planned > 0 ? <Meter percent={p.progress.percent} /> : null}
                        </td>
                        <td className="adm-small adm-muted">
                          {p.progress.nextSession ? formatDateTime(p.progress.nextSession) : "—"}
                        </td>
                        <td className="num adm-mono">
                          {p.billing.feeTotal > 0 ? formatMoney(p.billing.feeTotal) : "—"}
                        </td>
                        <td className="num adm-mono">{formatMoney(p.billing.paid)}</td>
                        <td className="num adm-mono">
                          {p.billing.due > 0 ? (
                            <strong style={{ color: "var(--adm-red)" }}>
                              {formatMoney(p.billing.due)}
                            </strong>
                          ) : (
                            <span className="adm-muted">Settled</span>
                          )}
                        </td>
                        <td className="adm-small">
                          {p.billing.installmentsTotal > 0 ? (
                            <>
                              <strong>{p.billing.installmentsLeft}</strong> left
                              <div className="adm-table-sub">
                                {p.billing.installmentsPaid}/{p.billing.installmentsTotal} paid ·{" "}
                                {formatMoney(p.billing.installmentAmount)} each
                              </div>
                            </>
                          ) : (
                            <span className="adm-muted">—</span>
                          )}
                        </td>
                        <td className="shrink">
                          <div className="adm-row-actions">
                            <Link href={`/admin/patients/${p.slug || p._id}`} className="adm-btn adm-btn-ghost adm-btn-sm" title="View Record & SOAP Notes">
                              📋 SOAP Notes
                            </Link>
                            <a href={`/admin/patients/${p.slug || p._id}/invoice`} target="_blank" rel="noreferrer" className="adm-btn adm-btn-ghost adm-btn-sm" title="Print Receipt / Invoice">
                              🖨️ Invoice
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pages > 1 ? (
                <div className="adm-pager">
                  <span>
                    Page {current} of {pages}
                  </span>
                  <span className="adm-inline">
                    {current > 1 ? (
                      <Link href={pageLink(current - 1)} className="adm-btn adm-btn-ghost adm-btn-sm">
                        ← Previous
                      </Link>
                    ) : null}
                    {current < pages ? (
                      <Link href={pageLink(current + 1)} className="adm-btn adm-btn-ghost adm-btn-sm">
                        Next →
                      </Link>
                    ) : null}
                  </span>
                </div>
              ) : null}
            </>
          )}
        </Card>
      </div>
    </>
  );
}
