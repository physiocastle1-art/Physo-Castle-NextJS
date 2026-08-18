"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, apiPatch, apiDelete } from "@/lib/client";
import { validateSession } from "@/lib/validation";
import { VISIT_TYPES } from "@/lib/enums";
import { Alert, Card, Empty, Field, SessionBadge } from "@/components/admin/ui";
import WhatsAppButton from "@/components/admin/WhatsAppButton";
import BulkBookForm from "@/components/admin/BulkBookForm";
import { sessionReminderText } from "@/lib/whatsapp";
import {
  SESSION_STATUS_LABEL,
  VISIT_TYPE_LABEL,
  formatDateTime,
  formatMoney,
  toDateInput,
  toDateTimeInput,
  fromDateTimeInput,
  DAY_MS,
} from "@/lib/format";

const emptyDraft = {
  scheduledAt: "",
  durationMin: 45,
  status: "scheduled",
  therapist: "Dr. Riddhi Shah (PT)",
  treatment: "",
  painScore: "",
  notes: "",
  visitType: "clinic",
  visitAddress: "",
  travelFee: "",
};

/* Tomorrow at 10:00 clinic time, as a datetime-local value. Built from the
   clinic-timezone date rather than the browser's, and computed on click rather
   than during render so server and client markup can't disagree. */
function defaultSlot() {
  return `${toDateInput(new Date(Date.now() + DAY_MS))}T10:00`;
}

export default function SessionManager({
  patientId,
  patientPhone,
  patientName,
  patientAddress,
  sessions,
  progress,
  settings,
  canDelete,
}) {
  const router = useRouter();
  const [mode, setMode] = useState("");
  const [draft, setDraft] = useState({
    ...emptyDraft,
    therapist: settings?.therapistName || emptyDraft.therapist,
    durationMin: settings?.defaultDurationMin || emptyDraft.durationMin,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [details, setDetails] = useState(null);
  // Set when the server refused only because the slot is outside clinic hours —
  // the one refusal the physiotherapist is allowed to overrule.
  const [overridable, setOverridable] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const set = (key) => (e) => {
    setDraft((d) => ({ ...d, [key]: e.target.value }));
    setFieldErrors((errs) => (errs[key] ? { ...errs, [key]: null } : errs));
    setOverridable(false);
  };

  async function addSession(force = false) {
    setError("");
    setDetails(null);

    // The naive datetime-local value becomes a real instant in clinic time
    // before validation, so "10:00" can't be read as 10:00 UTC.
    const { values, errors } = validateSession({
      ...draft,
      visitAddress: draft.visitType === "home" ? draft.visitAddress : "",
      travelFee: draft.visitType === "home" ? draft.travelFee : 0,
      scheduledAt: fromDateTimeInput(draft.scheduledAt),
    });

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setError("Please fix the highlighted fields.");
      return;
    }
    setFieldErrors({});
    setBusy(true);

    const res = await apiPost(`/api/admin/patients/${patientId}/sessions`, { ...values, force });

    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      setDetails(res.details);
      setOverridable(res.code === "outside_hours");
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      return;
    }

    setDraft({
      ...emptyDraft,
      therapist: settings?.therapistName || emptyDraft.therapist,
      durationMin: settings?.defaultDurationMin || emptyDraft.durationMin,
    });
    setOverridable(false);
    setMode("");
    router.refresh();
  }

  const openMode = (next) => {
    setMode((current) => (current === next ? "" : next));
    setError("");
    setOverridable(false);
    setDraft((d) => (d.scheduledAt ? d : { ...d, scheduledAt: defaultSlot() }));
  };

  return (
    <Card
      title="Sessions"
      subtitle={
        progress.planned > 0
          ? `${progress.completed} of ${progress.planned} completed · ${progress.remaining} remaining`
          : `${progress.completed} completed · ${progress.scheduled} scheduled`
      }
      action={
        <div className="adm-inline">
          <button
            type="button"
            className={`adm-btn adm-btn-sm ${mode === "one" ? "adm-btn-ghost" : "adm-btn-primary"}`}
            onClick={() => openMode("one")}
          >
            {mode === "one" ? "Close" : "+ Add session"}
          </button>
          <button
            type="button"
            className={`adm-btn adm-btn-sm ${mode === "bulk" ? "adm-btn-ghost" : "adm-btn-ghost"}`}
            onClick={() => openMode("bulk")}
            title="Book a whole course of treatment at once"
          >
            {mode === "bulk" ? "Close" : "⟳ Book a course"}
          </button>
        </div>
      }
      tight
    >
      {mode === "one" ? (
        <div style={{ padding: 18, borderBottom: "1px solid var(--adm-line-soft)" }}>
          <form
            className="adm-stack"
            onSubmit={(e) => {
              e.preventDefault();
              addSession(false);
            }}
            noValidate
          >
            <Alert tone="error" message={error} details={details} />

            {overridable ? (
              <div className="adm-inline">
                <button
                  type="button"
                  className="adm-btn adm-btn-ghost adm-btn-sm"
                  onClick={() => addSession(true)}
                  disabled={busy}
                >
                  Book it anyway
                </button>
                <span className="adm-small adm-muted">
                  Clashes with another booking are never overridable — this one is only outside your
                  usual hours.
                </span>
              </div>
            ) : null}

            <div className="adm-form-grid">
              <Field label="Date & time *" error={fieldErrors.scheduledAt}>
                <input
                  type="datetime-local"
                  value={draft.scheduledAt}
                  onChange={set("scheduledAt")}
                  required
                />
              </Field>
              <Field label="Duration (minutes)" error={fieldErrors.durationMin}>
                <input type="number" min="5" max="480" value={draft.durationMin} onChange={set("durationMin")} />
              </Field>
              <Field label="Status" error={fieldErrors.status}>
                <select value={draft.status} onChange={set("status")}>
                  {Object.entries(SESSION_STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Therapist" error={fieldErrors.therapist}>
                <input type="text" value={draft.therapist} onChange={set("therapist")} />
              </Field>

              <Field label="Visit type" error={fieldErrors.visitType}>
                <select value={draft.visitType} onChange={set("visitType")}>
                  {VISIT_TYPES.map((value) => (
                    <option key={value} value={value}>
                      {VISIT_TYPE_LABEL[value]}
                    </option>
                  ))}
                </select>
              </Field>

              {draft.visitType === "home" ? (
                <>
                  <Field label="Travel charge (₹)" error={fieldErrors.travelFee}>
                    <input type="number" min="0" value={draft.travelFee} onChange={set("travelFee")} />
                  </Field>
                  <Field
                    label="Visit address *"
                    span
                    hint={patientAddress ? "Leave as-is to use the address on file." : null}
                    error={fieldErrors.visitAddress}
                  >
                    <input
                      type="text"
                      value={draft.visitAddress || patientAddress || ""}
                      onChange={set("visitAddress")}
                      placeholder="Flat, building, area"
                    />
                  </Field>
                </>
              ) : null}

              <Field label="Treatment given" span error={fieldErrors.treatment}>
                <input
                  type="text"
                  value={draft.treatment}
                  onChange={set("treatment")}
                  placeholder="e.g. IFT + quads strengthening"
                />
              </Field>
              <Field label="Pain score (0–10)" error={fieldErrors.painScore}>
                <input type="number" min="0" max="10" value={draft.painScore} onChange={set("painScore")} />
              </Field>
              <Field label="Notes" span error={fieldErrors.notes}>
                <textarea value={draft.notes} onChange={set("notes")} />
              </Field>
            </div>

            <div className="adm-form-actions">
              <button type="submit" className="adm-btn adm-btn-primary" disabled={busy}>
                {busy ? "Adding…" : "Add session"}
              </button>
              <button
                type="button"
                className="adm-btn adm-btn-ghost"
                onClick={() => setMode("")}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {mode === "bulk" ? (
        <div style={{ padding: 18, borderBottom: "1px solid var(--adm-line-soft)" }}>
          <BulkBookForm
            patientId={patientId}
            patientAddress={patientAddress}
            settings={{
              ...settings,
              defaultCount: progress.remaining > 0 ? progress.remaining : progress.planned || 12,
            }}
            onDone={() => setMode("")}
          />
        </div>
      ) : null}

      {sessions.length === 0 ? (
        <Empty icon="◔" title="No sessions yet" hint="Add the first visit to start tracking progress." />
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th className="shrink">Visit</th>
                <th>When</th>
                <th>Status</th>
                <th>Treatment</th>
                <th className="num">Pain</th>
                <th className="shrink" />
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <SessionRow
                  key={s._id}
                  session={s}
                  patientPhone={patientPhone}
                  patientName={patientName}
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

function SessionRow({ session, patientPhone, patientName, settings, canDelete }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [details, setDetails] = useState(null);
  const [overridable, setOverridable] = useState(false);
  const [rowErrors, setRowErrors] = useState({});
  const [form, setForm] = useState({
    scheduledAt: toDateTimeInput(session.scheduledAt),
    status: session.status,
    treatment: session.treatment || "",
    painScore: session.painScore ?? "",
    notes: session.notes || "",
    durationMin: session.durationMin || 45,
    therapist: session.therapist || "",
    visitType: session.visitType || "clinic",
    visitAddress: session.visitAddress || "",
    travelFee: session.travelFee || "",
  });

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setOverridable(false);
  };

  async function patch(payload) {
    setBusy(true);
    setError("");
    setDetails(null);
    const res = await apiPatch(`/api/admin/sessions/${session._id}`, payload);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      setDetails(res.details);
      setOverridable(res.code === "outside_hours");
      if (res.fieldErrors) setRowErrors(res.fieldErrors);
      return false;
    }
    router.refresh();
    return true;
  }

  async function save(force = false) {
    setError("");

    const { values, errors } = validateSession({
      ...form,
      visitAddress: form.visitType === "home" ? form.visitAddress : "",
      travelFee: form.visitType === "home" ? form.travelFee : 0,
      scheduledAt: fromDateTimeInput(form.scheduledAt),
    });

    if (Object.keys(errors).length) {
      setRowErrors(errors);
      setError("Please fix the highlighted fields.");
      return;
    }
    setRowErrors({});

    const ok = await patch({ ...values, force });
    if (ok) setEditing(false);
  }

  async function remove() {
    if (!window.confirm(`Delete visit #${session.number}? This cannot be undone.`)) return;
    setBusy(true);
    const res = await apiDelete(`/api/admin/sessions/${session._id}`);
    setBusy(false);
    if (!res.ok) setError(res.error);
    else router.refresh();
  }

  if (editing) {
    return (
      <tr>
        <td colSpan={6} style={{ background: "var(--adm-surface-2)" }}>
          <form
            className="adm-stack"
            onSubmit={(e) => {
              e.preventDefault();
              save(false);
            }}
            noValidate
          >
            <Alert tone="error" message={error} details={details} />
            {overridable ? (
              <button
                type="button"
                className="adm-btn adm-btn-ghost adm-btn-sm"
                onClick={() => save(true)}
                disabled={busy}
              >
                Move it there anyway
              </button>
            ) : null}

            <div className="adm-form-grid">
              <Field label="Date & time" error={rowErrors.scheduledAt}>
                <input type="datetime-local" value={form.scheduledAt} onChange={set("scheduledAt")} />
              </Field>
              <Field label="Status" error={rowErrors.status}>
                <select value={form.status} onChange={set("status")}>
                  {Object.entries(SESSION_STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Duration (minutes)" error={rowErrors.durationMin}>
                <input type="number" min="5" max="480" value={form.durationMin} onChange={set("durationMin")} />
              </Field>
              <Field label="Therapist" error={rowErrors.therapist}>
                <input type="text" value={form.therapist} onChange={set("therapist")} />
              </Field>
              <Field label="Visit type" error={rowErrors.visitType}>
                <select value={form.visitType} onChange={set("visitType")}>
                  {VISIT_TYPES.map((value) => (
                    <option key={value} value={value}>
                      {VISIT_TYPE_LABEL[value]}
                    </option>
                  ))}
                </select>
              </Field>
              {form.visitType === "home" ? (
                <>
                  <Field label="Travel charge (₹)" error={rowErrors.travelFee}>
                    <input type="number" min="0" value={form.travelFee} onChange={set("travelFee")} />
                  </Field>
                  <Field label="Visit address" span error={rowErrors.visitAddress}>
                    <input type="text" value={form.visitAddress} onChange={set("visitAddress")} />
                  </Field>
                </>
              ) : null}
              <Field label="Treatment given" span error={rowErrors.treatment}>
                <input type="text" value={form.treatment} onChange={set("treatment")} />
              </Field>
              <Field label="Pain score (0–10)" error={rowErrors.painScore}>
                <input type="number" min="0" max="10" value={form.painScore} onChange={set("painScore")} />
              </Field>
              <Field label="Notes" span error={rowErrors.notes}>
                <textarea value={form.notes} onChange={set("notes")} />
              </Field>
            </div>
            <div className="adm-form-actions">
              <button type="submit" className="adm-btn adm-btn-primary adm-btn-sm" disabled={busy}>
                {busy ? "Saving…" : "Save visit"}
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
      <td className="adm-mono shrink">#{session.number}</td>
      <td>
        <span className="adm-small">{formatDateTime(session.scheduledAt)}</span>
        <div className="adm-table-sub">
          {session.durationMin} min · {session.therapist || "—"}
          {session.visitType === "home" ? (
            <>
              {" · "}
              <span title={session.visitAddress}>
                ⌂ Home{session.travelFee > 0 ? ` (+${formatMoney(session.travelFee)})` : ""}
              </span>
            </>
          ) : null}
        </div>
      </td>
      <td>
        <SessionBadge status={session.status} />
        {error ? <div className="adm-table-sub" style={{ color: "var(--adm-red)" }}>{error}</div> : null}
      </td>
      <td className="adm-small">
        {session.treatment || <span className="adm-muted">—</span>}
        {session.notes ? <div className="adm-table-sub">{session.notes}</div> : null}
      </td>
      <td className="num adm-mono">{session.painScore ?? "—"}</td>
      <td className="shrink">
        <div className="adm-row-actions">
          {session.status === "scheduled" ? (
            <>
              <button
                type="button"
                className="adm-btn adm-btn-ghost adm-btn-sm"
                disabled={busy}
                onClick={() => patch({ status: "completed" })}
              >
                ✓ Complete
              </button>
              <WhatsAppButton
                phone={patientPhone}
                message={sessionReminderText({
                  patientName,
                  session,
                  clinicName: settings?.clinicName,
                  therapistName: session.therapist || settings?.therapistName,
                })}
                label="Remind"
                title="Send this appointment reminder on WhatsApp"
              />
            </>
          ) : null}
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
