"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, apiPatch, apiDelete } from "@/lib/client";
import { validatePayment } from "@/lib/validation";
import { Alert, Card, Empty, Field, Meter } from "@/components/admin/ui";
import WhatsAppButton from "@/components/admin/WhatsAppButton";
import { duesReminderText, receiptText } from "@/lib/whatsapp";
import {
  PAYMENT_METHOD_LABEL,
  formatMoney,
  formatDate,
  toDateInput,
  fromDateInput,
} from "@/lib/format";

const emptyDraft = { amount: "", method: "cash", paidAt: "", note: "" };

export default function PaymentManager({
  patientId,
  patientSlug,
  patientPhone,
  patientName,
  payments,
  billing,
  settings,
  canDelete,
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const set = (key) => (e) => {
    setDraft((d) => ({ ...d, [key]: e.target.value }));
    setFieldErrors((errs) => (errs[key] ? { ...errs, [key]: null } : errs));
  };

  function openForm() {
    setAdding((a) => !a);
    // Pre-fill with the next instalment, or the whole balance if there's no plan.
    setDraft((d) => ({
      ...d,
      amount: d.amount || billing.nextInstallment || billing.due || "",
      paidAt: d.paidAt || toDateInput(new Date()),
    }));
  }

  async function addPayment(e) {
    e.preventDefault();
    setError("");

    const { values, errors } = validatePayment({
      ...draft,
      paidAt: fromDateInput(draft.paidAt),
    });

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setError("Please fix the highlighted fields.");
      return;
    }
    setFieldErrors({});
    setBusy(true);

    const res = await apiPost(`/api/admin/patients/${patientId}/payments`, values);
    setBusy(false);

    if (!res.ok) {
      setError(res.error);
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      return;
    }

    setDraft(emptyDraft);
    setAdding(false);
    router.refresh();
  }

  return (
    <Card
      title="Payments & instalments"
      subtitle={
        billing.feeTotal > 0
          ? `${formatMoney(billing.paid)} of ${formatMoney(billing.feeTotal)} received`
          : "No fee set for this patient yet"
      }
      action={
        <div className="adm-inline">
          {billing.due > 0 ? (
            <WhatsAppButton
              phone={patientPhone}
              message={duesReminderText({
                patientName,
                billing,
                clinicName: settings?.clinicName,
              })}
              label="Remind about dues"
              title="Send a payment reminder on WhatsApp"
            />
          ) : null}
          {patientSlug ? (
            <a
              href={`/admin/patients/${patientSlug}/invoice`}
              target="_blank"
              rel="noreferrer"
              className="adm-btn adm-btn-ghost adm-btn-sm"
              title="Full statement of the treatment plan and every payment"
            >
              🖨 Statement
            </a>
          ) : null}
          <button type="button" className="adm-btn adm-btn-primary adm-btn-sm" onClick={openForm}>
            {adding ? "Close" : "+ Record payment"}
          </button>
        </div>
      }
      tight
    >
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        {billing.feeTotal > 0 ? (
          <div>
            <div className="adm-inline" style={{ justifyContent: "space-between" }}>
              <span className="adm-small">
                <strong>{formatMoney(billing.due)}</strong> balance remaining
              </span>
              <span className="adm-small adm-muted">{billing.percentPaid}% paid</span>
            </div>
            <Meter percent={billing.percentPaid} amber={billing.due > 0} />
          </div>
        ) : null}

        {billing.installmentsTotal > 0 ? (
          <Alert
            tone={billing.installmentsLeft > 0 ? "warn" : "ok"}
            message={
              billing.installmentsLeft > 0
                ? `${billing.installmentsLeft} of ${billing.installmentsTotal} instalments left — next payment ${formatMoney(billing.nextInstallment)}.`
                : `All ${billing.installmentsTotal} instalments paid.`
            }
          />
        ) : null}

        {billing.overpaid > 0 ? (
          <Alert tone="info" message={`${formatMoney(billing.overpaid)} received above the agreed fee.`} />
        ) : null}

        <Alert tone="error" message={error} />

        {adding ? (
          <form className="adm-stack" onSubmit={addPayment} noValidate>
            <div className="adm-form-grid">
              <Field label="Amount (₹) *" error={fieldErrors.amount}>
                <input type="number" min="1" step="1" value={draft.amount} onChange={set("amount")} />
              </Field>
              <Field label="Method" error={fieldErrors.method}>
                <select value={draft.method} onChange={set("method")}>
                  {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Received on" error={fieldErrors.paidAt}>
                <input type="date" value={draft.paidAt} onChange={set("paidAt")} />
              </Field>
              <Field label="Note" span error={fieldErrors.note}>
                <input type="text" value={draft.note} onChange={set("note")} placeholder="Receipt no., UPI ref…" />
              </Field>
            </div>
            <div className="adm-form-actions">
              <button type="submit" className="adm-btn adm-btn-primary" disabled={busy}>
                {busy ? "Saving…" : "Record payment"}
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
      </div>

      {payments.length === 0 ? (
        <Empty icon="₹" title="No payments recorded" hint="Record one to reduce the balance." />
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Date</th>
                <th className="shrink">Receipt</th>
                <th>Method</th>
                <th>Note</th>
                <th className="num">Amount</th>
                <th className="shrink" />
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <PaymentRow
                  key={p._id}
                  payment={p}
                  patientSlug={patientSlug}
                  patientPhone={patientPhone}
                  patientName={patientName}
                  billing={billing}
                  settings={settings}
                  canDelete={canDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function PaymentRow({ payment, patientSlug, patientPhone, patientName, billing, settings, canDelete }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rowErrors, setRowErrors] = useState({});
  const [form, setForm] = useState({
    amount: payment.amount ?? "",
    method: payment.method || "cash",
    paidAt: toDateInput(payment.paidAt),
    note: payment.note || "",
  });

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setRowErrors((errs) => (errs[key] ? { ...errs, [key]: null } : errs));
  };

  async function save(e) {
    e.preventDefault();
    setError("");

    const { values, errors } = validatePayment({ ...form, paidAt: fromDateInput(form.paidAt) });
    if (Object.keys(errors).length) {
      setRowErrors(errors);
      setError("Please fix the highlighted fields.");
      return;
    }
    setRowErrors({});
    setBusy(true);

    const res = await apiPatch(`/api/admin/payments/${payment._id}`, values);
    setBusy(false);

    if (!res.ok) {
      setError(res.error);
      if (res.fieldErrors) setRowErrors(res.fieldErrors);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (!window.confirm(`Delete the ${formatMoney(payment.amount)} payment? This cannot be undone.`)) return;
    setBusy(true);
    const res = await apiDelete(`/api/admin/payments/${payment._id}`);
    setBusy(false);
    if (!res.ok) setError(res.error);
    else router.refresh();
  }

  if (editing) {
    return (
      <tr>
        <td colSpan={6} style={{ background: "var(--adm-surface-2)" }}>
          <form className="adm-stack" onSubmit={save} noValidate>
            <Alert tone="error" message={error} />
            <div className="adm-form-grid">
              <Field label="Amount (₹)" error={rowErrors.amount}>
                <input type="number" min="1" step="1" value={form.amount} onChange={set("amount")} />
              </Field>
              <Field label="Method" error={rowErrors.method}>
                <select value={form.method} onChange={set("method")}>
                  {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Received on" error={rowErrors.paidAt}>
                <input type="date" value={form.paidAt} onChange={set("paidAt")} />
              </Field>
              <Field label="Note" span error={rowErrors.note}>
                <input type="text" value={form.note} onChange={set("note")} />
              </Field>
            </div>
            <div className="adm-form-actions">
              <button type="submit" className="adm-btn adm-btn-primary adm-btn-sm" disabled={busy}>
                {busy ? "Saving…" : "Save payment"}
              </button>
              <button
                type="button"
                className="adm-btn adm-btn-ghost adm-btn-sm"
                onClick={() => setEditing(false)}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="adm-small">{formatDate(payment.paidAt)}</td>
      <td className="adm-mono adm-small shrink">
        {payment.receiptNo ? (
          <a
            href={`/admin/patients/${patientSlug}/receipt/${payment._id}`}
            target="_blank"
            rel="noreferrer"
            title="Open the printable receipt"
          >
            {payment.receiptNo}
          </a>
        ) : (
          // Payments recorded before receipt numbering existed. Run
          // `npm run backfill:receipts` to give them one.
          <span className="adm-muted">—</span>
        )}
      </td>
      <td className="adm-small adm-muted">{PAYMENT_METHOD_LABEL[payment.method] || payment.method}</td>
      <td className="adm-small adm-muted">
        {payment.note || "—"}
        {error ? <div style={{ color: "var(--adm-red)" }}>{error}</div> : null}
      </td>
      <td className="num adm-mono">{formatMoney(payment.amount)}</td>
      <td className="shrink">
        <div className="adm-row-actions">
          <WhatsAppButton
            phone={patientPhone}
            message={receiptText({
              patientName,
              payment,
              billing,
              clinicName: settings?.clinicName,
            })}
            label="Receipt"
            title="Send a payment confirmation on WhatsApp"
          />
          <button
            type="button"
            className="adm-btn adm-btn-ghost adm-btn-sm"
            onClick={() => setEditing(true)}
            disabled={busy}
          >
            Edit
          </button>
          {canDelete ? (
            <button type="button" className="adm-btn adm-btn-danger adm-btn-sm" onClick={remove} disabled={busy}>
              Delete
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
