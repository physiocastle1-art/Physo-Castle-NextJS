"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, apiPatch, apiDelete } from "@/lib/client";
import { Alert, Card, Empty, Field, Badge } from "./ui";
import { validatePackage } from "@/lib/validation";
import { PACKAGE_KINDS } from "@/lib/enums";
import { formatMoney, PACKAGE_KIND_LABEL } from "@/lib/format";

/* The clinic's price list.

   Patients keep their own copy of the numbers once a package is applied, so
   re-pricing here never rewrites a fee somebody already agreed to. That is also
   why deactivating beats deleting: an old package stays readable in the
   records that reference it. */

const emptyDraft = {
  name: "",
  kind: "clinic",
  sessions: 10,
  fee: "",
  installmentAmount: "",
  description: "",
  active: true,
};

export default function PackageManager({ rows = [], canManage = false }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const set = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setDraft((d) => ({ ...d, [key]: value }));
    setFieldErrors((errs) => (errs[key] ? { ...errs, [key]: null } : errs));
  };

  async function submit(e) {
    e.preventDefault();
    setError("");

    const { values, errors } = validatePackage(draft);
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setError("Please fix the highlighted fields.");
      return;
    }
    setFieldErrors({});
    setBusy(true);

    const res = await apiPost("/api/admin/packages", values);
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

  const perSession = (pkg) => (pkg.sessions > 0 ? pkg.fee / pkg.sessions : 0);

  return (
    <Card
      title="Package catalogue"
      subtitle="Set the price once here, then pick it when setting up a patient."
      action={
        canManage ? (
          <button
            type="button"
            className="adm-btn adm-btn-primary adm-btn-sm"
            onClick={() => setAdding((a) => !a)}
          >
            {adding ? "Close" : "+ New package"}
          </button>
        ) : null
      }
      tight
    >
      {adding ? (
        <div style={{ padding: 18, borderBottom: "1px solid var(--adm-line-soft)" }}>
          <form className="adm-stack" onSubmit={submit} noValidate>
            <Alert tone="error" message={error} />
            <div className="adm-form-grid">
              <Field label="Package name *" span error={fieldErrors.name}>
                <input
                  type="text"
                  value={draft.name}
                  onChange={set("name")}
                  placeholder="e.g. Knee rehab — 10 sessions"
                />
              </Field>
              <Field label="Type" error={fieldErrors.kind}>
                <select value={draft.kind} onChange={set("kind")}>
                  {PACKAGE_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {PACKAGE_KIND_LABEL[kind]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Sessions included" error={fieldErrors.sessions}>
                <input type="number" min="0" max="500" value={draft.sessions} onChange={set("sessions")} />
              </Field>
              <Field label="Total fee (₹) *" error={fieldErrors.fee}>
                <input type="number" min="0" value={draft.fee} onChange={set("fee")} />
              </Field>
              <Field
                label="Instalment amount (₹)"
                hint="Leave blank for pay-in-one-go"
                error={fieldErrors.installmentAmount}
              >
                <input
                  type="number"
                  min="0"
                  value={draft.installmentAmount}
                  onChange={set("installmentAmount")}
                />
              </Field>
              <Field label="Description" span error={fieldErrors.description}>
                <input type="text" value={draft.description} onChange={set("description")} />
              </Field>
            </div>
            <div className="adm-form-actions">
              <button type="submit" className="adm-btn adm-btn-primary" disabled={busy}>
                {busy ? "Saving…" : "Save package"}
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
        </div>
      ) : null}

      {rows.length === 0 ? (
        <Empty
          icon="₹"
          title="No packages yet"
          hint="Add the packages you actually sell — then a new patient is two clicks instead of three typed numbers."
        />
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Package</th>
                <th className="shrink">Type</th>
                <th className="num">Sessions</th>
                <th className="num">Fee</th>
                <th className="num">Per session</th>
                <th className="num">Instalment</th>
                <th className="shrink" />
              </tr>
            </thead>
            <tbody>
              {rows.map((pkg) => (
                <PackageRow
                  key={pkg._id}
                  pkg={pkg}
                  perSession={perSession(pkg)}
                  canManage={canManage}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function PackageRow({ pkg, perSession, canManage }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggleActive() {
    setBusy(true);
    const res = await apiPatch(`/api/admin/packages/${pkg._id}`, { active: !pkg.active });
    setBusy(false);
    if (!res.ok) setError(res.error);
    else router.refresh();
  }

  async function remove() {
    if (!window.confirm(`Delete "${pkg.name}"? Patients already on it keep their agreed fee.`)) return;
    setBusy(true);
    const res = await apiDelete(`/api/admin/packages/${pkg._id}`);
    setBusy(false);
    if (!res.ok) setError(res.error);
    else router.refresh();
  }

  return (
    <tr style={pkg.active ? undefined : { opacity: 0.55 }}>
      <td>
        <span className="adm-table-name">{pkg.name}</span>
        {pkg.description ? <div className="adm-table-sub">{pkg.description}</div> : null}
        {error ? <div className="adm-table-sub" style={{ color: "var(--adm-red)" }}>{error}</div> : null}
      </td>
      <td className="shrink">
        <Badge tone={pkg.active ? "blue" : "grey"}>{PACKAGE_KIND_LABEL[pkg.kind] || pkg.kind}</Badge>
      </td>
      <td className="num adm-mono">{pkg.sessions || "—"}</td>
      <td className="num adm-mono">{formatMoney(pkg.fee)}</td>
      <td className="num adm-mono adm-muted">{perSession > 0 ? formatMoney(perSession) : "—"}</td>
      <td className="num adm-mono">
        {pkg.installmentAmount > 0 ? formatMoney(pkg.installmentAmount) : "—"}
      </td>
      <td className="shrink">
        {canManage ? (
          <div className="adm-row-actions">
            <button
              type="button"
              className="adm-btn adm-btn-ghost adm-btn-sm"
              onClick={toggleActive}
              disabled={busy}
            >
              {pkg.active ? "Deactivate" : "Reactivate"}
            </button>
            <button type="button" className="adm-btn adm-btn-danger adm-btn-sm" onClick={remove} disabled={busy}>
              Delete
            </button>
          </div>
        ) : null}
      </td>
    </tr>
  );
}
