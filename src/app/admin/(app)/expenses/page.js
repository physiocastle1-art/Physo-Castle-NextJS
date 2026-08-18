import Link from "next/link";
import { requireUser, hasRole } from "@/lib/auth";
import { listExpenses, getProfitabilitySummary, getProfitAndLoss } from "@/lib/clinic";
import ExpenseManager from "@/components/admin/ExpenseManager";
import { BarChart, ChartLegend, CHART_COLORS } from "@/components/admin/Charts";
import { Card, PageHeader, Stat } from "@/components/admin/ui";
import { formatMoney, formatMonthKey, EXPENSE_CATEGORY_LABEL } from "@/lib/format";

export const metadata = { title: "Expenses & profit — Physio Castle Admin" };

const shortMoney = (n) => {
  const v = Number(n) || 0;
  const abs = Math.abs(v);
  if (abs >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `₹${Math.round(v / 1000)}k`;
  return `₹${Math.round(v)}`;
};

export default async function ExpensesPage({ searchParams }) {
  const user = await requireUser();
  const page = Number(searchParams?.page) || 1;

  const [{ rows, total, pages }, summary, pnl] = await Promise.all([
    listExpenses({ page }),
    getProfitabilitySummary(),
    getProfitAndLoss({ months: 12 }),
  ]);

  const canDelete = hasRole(user, "admin");

  return (
    <>
      <PageHeader eyebrow="Finance" title="Expenses & profit">
        <Link href="/admin/reports" className="adm-btn adm-btn-ghost">
          Full reports →
        </Link>
      </PageHeader>

      <div className="adm-body">
        <div className="adm-grid cols-4">
          <Stat
            label="Collected this month"
            value={formatMoney(summary.revenueThisMonth)}
            tone="good"
            hint="Payments received from patients"
          />
          <Stat
            label="Spent this month"
            value={formatMoney(summary.expensesThisMonth)}
            tone={summary.expensesThisMonth > 0 ? "warn" : "good"}
            hint="Rent, travel, consumables, salaries"
          />
          <Stat
            label="Net this month"
            value={formatMoney(summary.netIncomeThisMonth)}
            tone={summary.netIncomeThisMonth >= 0 ? "good" : "danger"}
            hint="What the practice actually kept"
          />
          <Stat
            label="Margin (12 months)"
            value={`${pnl.marginPercent}%`}
            tone={pnl.marginPercent >= 0 ? "good" : "danger"}
            hint={`${formatMoney(pnl.totals.net)} net on ${formatMoney(pnl.totals.revenue)} collected`}
          />
        </div>

        <Card
          title="The last 12 months"
          subtitle="Collected against spent. Revenue is money actually received, not money billed."
        >
          <BarChart
            rows={pnl.rows}
            bars={[
              { key: "revenue", label: "Collected", color: CHART_COLORS.revenue },
              { key: "expenses", label: "Expenses", color: CHART_COLORS.expenses },
              { key: "net", label: "Net", color: CHART_COLORS.net },
            ]}
            formatValue={shortMoney}
            formatRow={(row) => formatMonthKey(row.key)}
          />
          <ChartLegend
            items={[
              { label: "Collected", color: CHART_COLORS.revenue },
              { label: "Expenses", color: CHART_COLORS.expenses },
              { label: "Net", color: CHART_COLORS.net },
            ]}
          />
        </Card>

        <div className="adm-split">
          <Card title="Month by month" tight>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th className="num">Collected</th>
                    <th className="num">Expenses</th>
                    <th className="num">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {[...pnl.rows].reverse().map((row) => (
                    <tr key={row.key}>
                      <td>{formatMonthKey(row.key)}</td>
                      <td className="num adm-mono">{formatMoney(row.revenue)}</td>
                      <td className="num adm-mono">{formatMoney(row.expenses)}</td>
                      <td
                        className="num adm-mono"
                        style={{ color: row.net >= 0 ? "var(--adm-green)" : "var(--adm-red)", fontWeight: 600 }}
                      >
                        {formatMoney(row.net)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td>
                      <strong>Total</strong>
                    </td>
                    <td className="num adm-mono">
                      <strong>{formatMoney(pnl.totals.revenue)}</strong>
                    </td>
                    <td className="num adm-mono">
                      <strong>{formatMoney(pnl.totals.expenses)}</strong>
                    </td>
                    <td className="num adm-mono">
                      <strong>{formatMoney(pnl.totals.net)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Where the money went" subtitle="Last 12 months by category" tight>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th className="num">Total</th>
                    <th className="num">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {pnl.categoryBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="adm-muted adm-small" style={{ padding: 18 }}>
                        No expenses logged yet — until they are, “profit” is only revenue.
                      </td>
                    </tr>
                  ) : (
                    pnl.categoryBreakdown.map((c) => (
                      <tr key={c.category}>
                        <td>{EXPENSE_CATEGORY_LABEL[c.category] || c.category}</td>
                        <td className="num adm-mono">{formatMoney(c.total)}</td>
                        <td className="num adm-mono adm-muted">
                          {pnl.totals.expenses > 0
                            ? `${Math.round((c.total / pnl.totals.expenses) * 100)}%`
                            : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <ExpenseManager
          initialRows={rows}
          total={total}
          pages={pages}
          currentPage={page}
          summary={summary}
          canDelete={canDelete}
        />
      </div>
    </>
  );
}
