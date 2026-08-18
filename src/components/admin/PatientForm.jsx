"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, apiPatch } from "@/lib/client";
import { validatePatient } from "@/lib/validation";
import { Alert, Field } from "@/components/admin/ui";
import { GENDER_LABEL, PATIENT_STATUS_LABEL, toDateInput, fromDateInput } from "@/lib/format";

const BODY_PARTS = [
  "Neck",
  "Shoulder",
  "Elbow",
  "Wrist / Fingers",
  "Upper back",
  "Lower back",
  "Hip",
  "Knee",
  "Ankle / Feet",
  "Post-surgery",
  "Neuro / Stroke",
  "Women's health",
];

const blank = {
  name: "",
  phone: "",
  email: "",
  age: "",
  gender: "undisclosed",
  address: "",
  city: "Surat",
  complaintAreas: [],
  diagnosis: "",
  referredBy: "",
  status: "active",
  notes: "",
  plan: { packageName: "", totalSessions: "", feeTotal: "", installmentAmount: "", startedAt: "" },
};

function toForm(patient) {
  if (!patient) return blank;
  return {
    name: patient.name || "",
    phone: patient.phone || "",
    email: patient.email || "",
    age: patient.age ?? "",
    gender: patient.gender || "undisclosed",
    address: patient.address || "",
    city: patient.city || "Surat",
    complaintAreas: patient.complaintAreas || [],
    diagnosis: patient.diagnosis || "",
    referredBy: patient.referredBy || "",
    status: patient.status || "active",
    notes: patient.notes || "",
    plan: {
      packageName: patient.plan?.packageName || "",
      totalSessions: patient.plan?.totalSessions || "",
      feeTotal: patient.plan?.feeTotal || "",
      installmentAmount: patient.plan?.installmentAmount || "",
      startedAt: toDateInput(patient.plan?.startedAt),
    },
  };
}

export default function PatientForm({ patient = null, packages = [], onDone }) {
  const router = useRouter();
  const isEdit = Boolean(patient);
  const [form, setForm] = useState(() => toForm(patient));
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    // Clear the message as soon as they start fixing the field.
    setFieldErrors((errs) => (errs[key] ? { ...errs, [key]: null } : errs));
  };

  const setPlan = (key) => (e) => {
    setForm((f) => ({ ...f, plan: { ...f.plan, [key]: e.target.value } }));
    setFieldErrors((errs) => (errs[`plan.${key}`] ? { ...errs, [`plan.${key}`]: null } : errs));
  };

  /* Picking from the catalogue copies the numbers in rather than linking to the
     package. The patient then owns their agreed fee: re-pricing the catalogue
     next year cannot rewrite what somebody signed up for, and the fee stays
     editable here for the one-off discount every clinic ends up giving. */
  const applyPackage = (e) => {
    const chosen = packages.find((p) => p._id === e.target.value);
    if (!chosen) return;
    setForm((f) => ({
      ...f,
      plan: {
        ...f.plan,
        packageName: chosen.name,
        totalSessions: chosen.sessions || "",
        feeTotal: chosen.fee || "",
        installmentAmount: chosen.installmentAmount || "",
      },
    }));
    setFieldErrors({});
  };

  const toggleArea = (area) =>
    setForm((f) => ({
      ...f,
      complaintAreas: f.complaintAreas.includes(area)
        ? f.complaintAreas.filter((a) => a !== area)
        : [...f.complaintAreas, area],
    }));

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSaved("");

    // Same validator the API route runs. This is for instant feedback; the
    // server's copy is what actually decides.
    const raw = {
      ...form,
      plan: { ...form.plan, startedAt: fromDateInput(form.plan.startedAt) },
    };
    const { values, plan, errors } = validatePatient(raw);

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setError("Please fix the highlighted fields.");
      return;
    }
    setFieldErrors({});
    setBusy(true);

    const payload = { ...values, plan };
    const res = isEdit
      ? await apiPatch(`/api/admin/patients/${patient._id}`, payload)
      : await apiPost("/api/admin/patients", payload);

    if (!res.ok) {
      setError(res.error);
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      setBusy(false);
      return;
    }

    if (isEdit) {
      setSaved("Patient details updated.");
      setBusy(false);
      router.refresh();
      onDone?.();
    } else {
      router.replace(`/admin/patients/${res.data.slug}`);
      router.refresh();
    }
  }

  const err = (key) => fieldErrors[key] || null;

  return (
    <form className="adm-stack" onSubmit={onSubmit} noValidate>
      <Alert tone="error" message={error} />
      <Alert tone="ok" message={saved} />

      <fieldset className="adm-fieldset">
        <legend>Patient details</legend>
        <div className="adm-form-grid">
          <Field label="Full name *" error={err("name")} hint="Letters only — no digits.">
            <input type="text" value={form.name} onChange={set("name")} autoComplete="off" />
          </Field>
          <Field
            label="Mobile number *"
            error={err("phone")}
            hint="10 digits, starting 6–9. +91 and spaces are fine."
          >
            <input type="tel" inputMode="numeric" value={form.phone} onChange={set("phone")} />
          </Field>
          <Field label="Email" error={err("email")}>
            <input type="email" value={form.email} onChange={set("email")} />
          </Field>
          <Field label="Age" error={err("age")}>
            <input type="number" min="0" max="120" value={form.age} onChange={set("age")} />
          </Field>
          <Field label="Gender" error={err("gender")}>
            <select value={form.gender} onChange={set("gender")}>
              {Object.entries(GENDER_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="City" error={err("city")}>
            <input type="text" value={form.city} onChange={set("city")} />
          </Field>
          <Field label="Address" span error={err("address")}>
            <input
              type="text"
              value={form.address}
              onChange={set("address")}
              placeholder="Flat / area / landmark"
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="adm-fieldset">
        <legend>Clinical</legend>

        <div className="adm-field">
          <label>Complaint areas</label>
          <div className="adm-chips">
            {BODY_PARTS.map((area) => (
              <button
                type="button"
                key={area}
                className={`adm-chip${form.complaintAreas.includes(area) ? " on" : ""}`}
                aria-pressed={form.complaintAreas.includes(area)}
                onClick={() => toggleArea(area)}
              >
                {area}
              </button>
            ))}
          </div>
        </div>

        <div className="adm-form-grid">
          <Field label="Diagnosis / assessment" span error={err("diagnosis")}>
            <input type="text" value={form.diagnosis} onChange={set("diagnosis")} />
          </Field>
          <Field label="Referred by" error={err("referredBy")}>
            <input type="text" value={form.referredBy} onChange={set("referredBy")} />
          </Field>
          <Field label="Case status" error={err("status")}>
            <select value={form.status} onChange={set("status")}>
              {Object.entries(PATIENT_STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Notes"
            span
            error={err("notes")}
            hint="History, precautions, anything to remember before a visit."
          >
            <textarea value={form.notes} onChange={set("notes")} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="adm-fieldset">
        <legend>Treatment package & instalments</legend>
        <div className="adm-form-grid">
          {packages.length ? (
            <Field
              label="Pick from the catalogue"
              span
              hint="Fills the fields below — you can still adjust any of them."
            >
              <select value="" onChange={applyPackage}>
                <option value="">Choose a package…</option>
                {packages.map((pkg) => (
                  <option key={pkg._id} value={pkg._id}>
                    {pkg.name} — ₹{pkg.fee}
                    {pkg.sessions ? ` · ${pkg.sessions} sessions` : ""}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          <Field label="Package name" error={err("plan.packageName")}>
            <input
              type="text"
              value={form.plan.packageName}
              onChange={setPlan("packageName")}
              placeholder="e.g. Knee rehab — 12 visits"
            />
          </Field>
          <Field
            label="Planned sessions"
            error={err("plan.totalSessions")}
            hint="Drives the “x of y completed” progress."
          >
            <input
              type="number"
              min="0"
              max="500"
              value={form.plan.totalSessions}
              onChange={setPlan("totalSessions")}
            />
          </Field>
          <Field label="Total fee (₹)" error={err("plan.feeTotal")}>
            <input type="number" min="0" step="1" value={form.plan.feeTotal} onChange={setPlan("feeTotal")} />
          </Field>
          <Field
            label="Instalment amount (₹)"
            error={err("plan.installmentAmount")}
            hint="Leave blank if the fee is paid in one go."
          >
            <input
              type="number"
              min="0"
              step="1"
              value={form.plan.installmentAmount}
              onChange={setPlan("installmentAmount")}
            />
          </Field>
          <Field label="Treatment started on" error={err("plan.startedAt")}>
            <input type="date" value={form.plan.startedAt} onChange={setPlan("startedAt")} />
          </Field>
        </div>
      </fieldset>

      <div className="adm-form-actions">
        <button type="submit" className="adm-btn adm-btn-primary" disabled={busy}>
          {busy ? "Saving…" : isEdit ? "Save changes" : "Create patient"}
        </button>
        {isEdit && onDone ? (
          <button type="button" className="adm-btn adm-btn-ghost" onClick={onDone} disabled={busy}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
