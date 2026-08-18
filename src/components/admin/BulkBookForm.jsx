"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/client";
import { Alert, Field } from "./ui";
import { generateOccurrences, BULK_MAX } from "@/lib/recurrence";
import { WEEKDAY_SHORT } from "@/lib/hours";
import { toDateInput, VISIT_TYPE_LABEL } from "@/lib/format";
import { VISIT_TYPES } from "@/lib/enums";

/* Booking a course of treatment in one go.

   The preview below the form is not a guess — it calls the same
   generateOccurrences() the API calls, with the same clinic settings, so what
   is listed is what gets created. Holidays are struck out before submission;
   slots that turn out to be taken come back in the result, because only the
   database knows about those. */

export default function BulkBookForm({ patientId, patientAddress, settings, onDone }) {
  const router = useRouter();

  const [form, setForm] = useState({
    startDate: toDateInput(new Date()),
    time: "10:00",
    weekdays: [1, 3, 5],
    count: settings?.defaultCount || 12,
    durationMin: settings?.defaultDurationMin || 45,
    therapist: settings?.therapistName || "",
    treatment: "",
    visitType: "clinic",
    visitAddress: patientAddress || "",
    travelFee: "",
    skipHolidays: true,
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [result, setResult] = useState(null);

  const set = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((errs) => (errs[key] ? { ...errs, [key]: null } : errs));
  };

  const toggleDay = (day) =>
    setForm((f) => ({
      ...f,
      weekdays: f.weekdays.includes(day)
        ? f.weekdays.filter((d) => d !== day)
        : [...f.weekdays, day].sort(),
    }));

  const preview = useMemo(
    () =>
      generateOccurrences({
        startDate: form.startDate,
        time: form.time,
        weekdays: form.weekdays,
        count: Number(form.count),
        settings,
        skipHolidays: form.skipHolidays,
      }),
    [form.startDate, form.time, form.weekdays, form.count, form.skipHolidays, settings]
  );

  const outsideHours = preview.occurrences.filter((o) => o.outsideHours).length;

  async function submit(e) {
    e.preventDefault();
    setError("");
    setResult(null);

    if (Object.keys(preview.errors).length) {
      setFieldErrors(preview.errors);
      setError("Please fix the highlighted fields.");
      return;
    }

    setBusy(true);
    const res = await apiPost(`/api/admin/patients/${patientId}/sessions/bulk`, {
      startDate: form.startDate,
      time: form.time,
      weekdays: form.weekdays,
      count: Number(form.count),
      skipHolidays: form.skipHolidays,
      durationMin: Number(form.durationMin),
      therapist: form.therapist,
      treatment: form.treatment,
      visitType: form.visitType,
      visitAddress: form.visitType === "home" ? form.visitAddress : "",
      travelFee: form.visitType === "home" ? form.travelFee : 0,
    });
    setBusy(false);

    if (!res.ok) {
      setError(res.error);
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      return;
    }

    setResult(res.data);
    router.refresh();
    // Only close automatically when everything landed — if some slots were
    // skipped, the list of what to rebook has to stay on screen.
    if (!res.data.skipped?.length) onDone?.();
  }

  return (
    <form className="adm-stack" onSubmit={submit} noValidate>
      <Alert tone="error" message={error} />

      {result ? (
        <Alert
          tone={result.skipped?.length ? "warn" : "ok"}
          message={`${result.created} session${result.created === 1 ? "" : "s"} booked.${
            result.skipped?.length ? ` ${result.skipped.length} date(s) were not booked:` : ""
          }`}
          details={result.skipped?.map((s) => `${s.label}${s.time ? ` ${s.time}` : ""} — ${s.reason}`)}
        />
      ) : null}

      <div className="adm-form-grid">
        <Field label="First session on *" error={fieldErrors.startDate}>
          <input type="date" value={form.startDate} onChange={set("startDate")} />
        </Field>
        <Field label="Time *" error={fieldErrors.time}>
          <input type="time" value={form.time} onChange={set("time")} />
        </Field>
        <Field
          label="How many sessions *"
          hint={`Up to ${BULK_MAX} at a time`}
          error={fieldErrors.count}
        >
          <input type="number" min="1" max={BULK_MAX} value={form.count} onChange={set("count")} />
        </Field>
        <Field label="Duration (minutes)" error={fieldErrors.durationMin}>
          <input type="number" min="5" max="480" value={form.durationMin} onChange={set("durationMin")} />
        </Field>

        <Field label="Repeats on *" span error={fieldErrors.weekdays}>
          <div className="adm-chips">
            {WEEKDAY_SHORT.map((label, day) => (
              <button
                key={label}
                type="button"
                className={`adm-chip${form.weekdays.includes(day) ? " on" : ""}`}
                onClick={() => toggleDay(day)}
                aria-pressed={form.weekdays.includes(day)}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Therapist" error={fieldErrors.therapist}>
          <input type="text" value={form.therapist} onChange={set("therapist")} />
        </Field>
        <Field label="Visit type" error={fieldErrors.visitType}>
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
            <Field label="Visit address *" span error={fieldErrors.visitAddress}>
              <input
                type="text"
                value={form.visitAddress}
                onChange={set("visitAddress")}
                placeholder="Flat, building, area"
              />
            </Field>
            <Field label="Travel charge per visit (₹)" error={fieldErrors.travelFee}>
              <input type="number" min="0" value={form.travelFee} onChange={set("travelFee")} />
            </Field>
          </>
        ) : null}

        <Field label="Planned treatment" span error={fieldErrors.treatment}>
          <input
            type="text"
            value={form.treatment}
            onChange={set("treatment")}
            placeholder="e.g. IFT + quads strengthening"
          />
        </Field>
      </div>

      <label className="adm-check">
        <input type="checkbox" checked={form.skipHolidays} onChange={set("skipHolidays")} />
        Skip clinic holidays and roll forward
      </label>

      <div className="adm-preview">
        <div className="adm-preview-head">
          <strong>{preview.occurrences.length} session(s) will be created</strong>
          {outsideHours > 0 ? (
            <span className="adm-badge amber">{outsideHours} outside clinic hours</span>
          ) : null}
          {preview.skipped.length ? (
            <span className="adm-badge grey">{preview.skipped.length} holiday(s) skipped</span>
          ) : null}
        </div>

        {preview.occurrences.length ? (
          <ul className="adm-preview-list">
            {preview.occurrences.map((o) => (
              <li key={o.key} className={o.outsideHours ? "warn" : ""}>
                {o.label} · {o.time}
                {o.outsideHours ? <span className="adm-preview-flag">outside hours</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="adm-muted adm-small">
            {preview.errors.weekdays || preview.errors.count || "Choose a start date and days."}
          </p>
        )}

        {preview.skipped.length ? (
          <ul className="adm-preview-list muted">
            {preview.skipped.map((s) => (
              <li key={s.key}>
                <s>{s.label}</s> — {s.reason}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="adm-form-actions">
        <button
          type="submit"
          className="adm-btn adm-btn-primary"
          disabled={busy || !preview.occurrences.length}
        >
          {busy ? "Booking…" : `Book ${preview.occurrences.length} session(s)`}
        </button>
        <button type="button" className="adm-btn adm-btn-ghost" onClick={onDone} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}
