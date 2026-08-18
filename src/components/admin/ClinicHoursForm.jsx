"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPut } from "@/lib/client";
import { Alert, Card, Field } from "./ui";
import { validateClinicSettings } from "@/lib/validation";
import { WEEKDAY_LABEL, todayKey } from "@/lib/hours";

/* Opening hours, holidays, and the details that print on a receipt.

   Hours are not decoration: they decide which bookings the API refuses and what
   the calendar draws as available, which is why this is admin-only. */

export default function ClinicHoursForm({ settings }) {
  const router = useRouter();

  const [form, setForm] = useState(() => ({
    ...settings,
    workingHours: settings.workingHours.map((h) => ({ ...h })),
    holidays: settings.holidays.map((h) => ({ ...h })),
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setSaved(false);
  };

  const setDay = (day, patch) =>
    setForm((f) => ({
      ...f,
      workingHours: f.workingHours.map((h) => (h.day === day ? { ...h, ...patch } : h)),
    }));

  const addHoliday = () =>
    setForm((f) => ({ ...f, holidays: [...f.holidays, { date: todayKey(), label: "" }] }));

  const setHoliday = (index, patch) =>
    setForm((f) => ({
      ...f,
      holidays: f.holidays.map((h, i) => (i === index ? { ...h, ...patch } : h)),
    }));

  const removeHoliday = (index) =>
    setForm((f) => ({ ...f, holidays: f.holidays.filter((_, i) => i !== index) }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSaved(false);

    const { values, errors } = validateClinicSettings(form);
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setError("Please fix the highlighted fields.");
      return;
    }
    setFieldErrors({});
    setBusy(true);

    const res = await apiPut("/api/admin/settings/clinic", values);
    setBusy(false);

    if (!res.ok) {
      setError(res.error);
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="adm-stack">
        <Alert tone="error" message={error} />
        {saved ? <Alert tone="ok" message="Clinic settings saved." /> : null}

        <Card title="Opening hours" subtitle="What the calendar draws, and what a booking is checked against">
          <div className="adm-hours">
            {form.workingHours.map((day) => (
              <div key={day.day} className={`adm-hours-row${day.closed ? " is-closed" : ""}`}>
                <span className="adm-hours-day">{WEEKDAY_LABEL[day.day]}</span>

                <label className="adm-check">
                  <input
                    type="checkbox"
                    checked={!day.closed}
                    onChange={(e) => setDay(day.day, { closed: !e.target.checked })}
                  />
                  Open
                </label>

                <input
                  type="time"
                  value={day.open}
                  disabled={day.closed}
                  onChange={(e) => setDay(day.day, { open: e.target.value })}
                  aria-label={`${WEEKDAY_LABEL[day.day]} opening time`}
                />
                <span className="adm-muted">to</span>
                <input
                  type="time"
                  value={day.close}
                  disabled={day.closed}
                  onChange={(e) => setDay(day.day, { close: e.target.value })}
                  aria-label={`${WEEKDAY_LABEL[day.day]} closing time`}
                />

                {fieldErrors[`hours.${day.day}`] ? (
                  <span className="adm-field-error">{fieldErrors[`hours.${day.day}`]}</span>
                ) : null}
              </div>
            ))}
          </div>

          <div className="adm-form-grid" style={{ marginTop: 16 }}>
            <Field
              label="Calendar slot size (minutes)"
              hint="How finely the week grid is ruled"
              error={fieldErrors.slotMinutes}
            >
              <input type="number" min="10" max="120" value={form.slotMinutes} onChange={set("slotMinutes")} />
            </Field>
            <Field label="Default session length (minutes)" error={fieldErrors.defaultDurationMin}>
              <input
                type="number"
                min="5"
                max="480"
                value={form.defaultDurationMin}
                onChange={set("defaultDurationMin")}
              />
            </Field>
          </div>
        </Card>

        <Card
          title="Holidays"
          subtitle="Full-day closures. Bookings on these dates are refused, and a course of treatment rolls past them."
          action={
            <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={addHoliday}>
              + Add holiday
            </button>
          }
        >
          {form.holidays.length === 0 ? (
            <p className="adm-muted adm-small">No holidays set.</p>
          ) : (
            <div className="adm-stack">
              {form.holidays.map((holiday, index) => (
                <div key={`${holiday.date}-${index}`} className="adm-holiday-row">
                  <input
                    type="date"
                    value={holiday.date}
                    onChange={(e) => setHoliday(index, { date: e.target.value })}
                    aria-label="Holiday date"
                  />
                  <input
                    type="text"
                    value={holiday.label}
                    placeholder="e.g. Diwali"
                    onChange={(e) => setHoliday(index, { label: e.target.value })}
                    aria-label="Holiday name"
                  />
                  <button
                    type="button"
                    className="adm-btn adm-btn-danger adm-btn-sm"
                    onClick={() => removeHoliday(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          {fieldErrors.holidays ? <span className="adm-field-error">{fieldErrors.holidays}</span> : null}
        </Card>

        <Card title="Clinic details" subtitle="These print on every receipt and appear in WhatsApp messages">
          <div className="adm-form-grid">
            <Field label="Clinic name *" error={fieldErrors.clinicName}>
              <input type="text" value={form.clinicName} onChange={set("clinicName")} />
            </Field>
            <Field label="Therapist name" error={fieldErrors.therapistName}>
              <input type="text" value={form.therapistName} onChange={set("therapistName")} />
            </Field>
            <Field label="Address" span error={fieldErrors.clinicAddress}>
              <input type="text" value={form.clinicAddress} onChange={set("clinicAddress")} />
            </Field>
            <Field label="Phone" error={fieldErrors.clinicPhone}>
              <input type="tel" value={form.clinicPhone} onChange={set("clinicPhone")} />
            </Field>
            <Field label="Email" error={fieldErrors.clinicEmail}>
              <input type="email" value={form.clinicEmail} onChange={set("clinicEmail")} />
            </Field>
            <Field
              label="Receipt prefix *"
              hint="Receipts are numbered PREFIX/2026-27/0001"
              error={fieldErrors.receiptPrefix}
            >
              <input type="text" value={form.receiptPrefix} onChange={set("receiptPrefix")} />
            </Field>
            <Field label="Receipt footer note" span error={fieldErrors.receiptFooter}>
              <input type="text" value={form.receiptFooter} onChange={set("receiptFooter")} />
            </Field>
          </div>
        </Card>

        <div className="adm-form-actions">
          <button type="submit" className="adm-btn adm-btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Save clinic settings"}
          </button>
        </div>
      </div>
    </form>
  );
}
