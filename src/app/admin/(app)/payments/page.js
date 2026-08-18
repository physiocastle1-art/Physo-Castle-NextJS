import Link from "next/link";
import { listPayments } from "@/lib/clinic";
import { formatMoney, formatDate, PAYMENT_METHOD_LABEL } from "@/lib/format";
import { Card, Empty, PageHeader, Stat } from "@/components/admin/ui";

export const metadata = { title: "Payments — Physio Castle Admin" };

export default async function PaymentsPage({ searchParams }) {
  const page = Number(searchParams?.page) || 1;
  const { rows, total, pages, page: current, allTimeTotal, monthTotal } = await listPayments({ page });

  return (
    <>
      <PageHeader eyebrow="Money" title="Payments" />

      <div className="adm-body">
        <div className="adm-grid cols-3">
          <Stat label="Collected this month" value={formatMoney(monthTotal)} tone="good" />
          <Stat label="Collected all time" value={formatMoney(allTimeTotal)} />
          <Stat label="Payments recorded" value={total} hint="Individual entries" />
        </div>

        <Card
          title="Payment ledger"
          subtitle="Newest first. Record and remove payments from a patient's page."
          tight
        >
          {rows.length === 0 ? (
            <Empty icon="₹" title="No payments yet" hint="Open a patient and record their first payment." />
          ) : (
            <>
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Patient</th>
                      <th>Method</th>
                      <th>Note</th>
                      <th className="num">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => (
                      <tr key={p._id}>
                        <td className="adm-small">{formatDate(p.paidAt)}</td>
                        <td>
                          {p.patient ? (
                            <Link href={`/admin/patients/${p.patient.slug}`} className="adm-table-name">
                              {p.patient.name}
                            </Link>
                          ) : (
                            <span className="adm-muted">Deleted patient</span>
                          )}
                          <div className="adm-table-sub">{p.patient?.phone}</div>
                        </td>
                        <td className="adm-small adm-muted">
                          {PAYMENT_METHOD_LABEL[p.method] || p.method}
                        </td>
                        <td className="adm-small adm-muted">{p.note || "—"}</td>
                        <td className="num adm-mono">{formatMoney(p.amount)}</td>
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
                      <Link
                        href={`/admin/payments${current - 1 > 1 ? `?page=${current - 1}` : ""}`}
                        className="adm-btn adm-btn-ghost adm-btn-sm"
                      >
                        ← Previous
                      </Link>
                    ) : null}
                    {current < pages ? (
                      <Link
                        href={`/admin/payments?page=${current + 1}`}
                        className="adm-btn adm-btn-ghost adm-btn-sm"
                      >
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
