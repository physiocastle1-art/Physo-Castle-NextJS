"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Card, Empty, Field } from "./ui";
import { apiPost, apiDelete } from "@/lib/client";
import { validateExpense } from "@/lib/validation";
import { formatMoney, formatDate, toDateInput, fromDateInput, EXPENSE_CATEGORY_LABEL } from "@/lib/format";
import { EXPENSE_CATEGORIES } from "@/lib/enums";

const CATEGORY_LABELS = Object.fromEntries(
  EXPENSE_CATEGORIES.map((key) => [key, EXPENSE_CATEGORY_LABEL[key]])
);

export default function ExpenseManager({
  initialRows = [],
  summary,
  canDelete = false,
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [category, setCategory] = useState("travel_home_visit");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(toDateInput(new Date()));
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");

    // The date input is timezone-naive; fromDateInput pins it to clinic time so
    // an expense dated the 1st doesn't land in the previous month's P&L.
    const { values, errors } = validateExpense({
      category,
      amount,
      date: fromDateInput(date),
      description,
    });

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setError("Please fix the highlighted fields.");
      return;
    }
    setFieldErrors({});
    setBusy(true);

    const res = await apiPost("/api/admin/expenses", values);
    setBusy(false);

    if (!res.ok) {
      setError(res.error);
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      return;
    }

    setAmount("");
    setDescription("");
    setAdding(false);
    router.refresh();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this expense record? This cannot be undone.")) return;
    const res = await apiDelete(`/api/admin/expenses/${id}`);
    if (!res.ok) setError(res.error);
    else router.refresh();
  };

  return (
    <div style={{ marginTop: "24px" }}>
      <Card
        title="Operational Expense Ledger"
        subtitle="Track expenses to calculate true net monthly profitability."
        action={
          <button
            type="button"
            className="adm-btn adm-btn-primary adm-btn-sm"
            onClick={() => setAdding(!adding)}
          >
            {adding ? "Close" : "+ Log Expense"}
          </button>
        }
      >
        <div style={{ padding: 18 }}>
          <Alert tone="error" message={error} />

          {adding ? (
            <form onSubmit={handleAdd} className="adm-stack" style={{ marginBottom: "20px" }}>
              <div className="adm-form-grid">
                <Field label="Category *" error={fieldErrors.category}>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Amount (₹) *" error={fieldErrors.amount}>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 1500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </Field>

                <Field label="Expense Date" error={fieldErrors.date}>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </Field>

                <Field label="Notes / Description" span error={fieldErrors.description}>
                  <input
                    type="text"
                    placeholder="e.g. Fuel for home visits in Adajan area, ultrasound gel refill..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </Field>
              </div>

              <div className="adm-form-actions">
                <button type="submit" className="adm-btn adm-btn-primary" disabled={busy}>
                  {busy ? "Saving..." : "Save Expense"}
                </button>
                <button
                  type="button"
                  className="adm-btn adm-btn-ghost"
                  onClick={() => setAdding(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : null}

          {/* Category Breakdown Badges */}
          {summary?.categoryBreakdown?.length > 0 ? (
            <div style={{ marginBottom: "20px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {summary.categoryBreakdown.map((item) => (
                <div
                  key={item.category}
                  style={{
                    background: "var(--adm-surface-2, #f1f5f9)",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{CATEGORY_LABELS[item.category] || item.category}:</span>{" "}
                  <span style={{ color: "var(--adm-red)", fontWeight: 700 }}>{formatMoney(item.total)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {initialRows.length === 0 ? (
          <Empty
            icon="📊"
            title="No operational expenses recorded"
            hint="Click '+ Log Expense' to record clinic rent, transit costs, or equipment purchases."
          />
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description / Notes</th>
                  <th className="num">Amount</th>
                  <th className="shrink" />
                </tr>
              </thead>
              <tbody>
                {initialRows.map((row) => (
                  <tr key={row._id}>
                    <td className="adm-small">{formatDate(row.date)}</td>
                    <td className="adm-small" style={{ fontWeight: 600 }}>
                      {CATEGORY_LABELS[row.category] || row.category}
                    </td>
                    <td className="adm-small adm-muted">{row.description || "—"}</td>
                    <td className="num adm-mono" style={{ color: "#dc2626", fontWeight: 700 }}>
                      {formatMoney(row.amount)}
                    </td>
                    <td className="shrink">
                      {canDelete ? (
                        <button
                          type="button"
                          className="adm-btn adm-btn-danger adm-btn-sm"
                          onClick={() => handleDelete(row._id)}
                        >
                          Delete
                        </button>
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
  );
}
