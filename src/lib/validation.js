/* ONE definition of every field rule, imported by both the browser forms and
   the API routes.

   Pure module — no mongoose, no next/headers — so the same function that shows
   an inline error under an input is the function that guards the database. If a
   rule only lived in the form, a hand-crafted request would walk straight past
   it; if it only lived on the server, the user would have to submit to find out.

   Every validator returns { values, errors } where errors is
   { fieldName: "human readable reason" } and is empty when the input is good. */

// Relative, not "@/", so scripts/ can import this file with plain Node.
import {
  GENDERS,
  PATIENT_STATUSES,
  SESSION_STATUSES,
  PAYMENT_METHODS,
  VISIT_TYPES,
  EXPENSE_CATEGORIES,
  PACKAGE_KINDS,
} from "./enums.js";

export const LIMITS = {
  nameMin: 2,
  nameMax: 120,
  ageMax: 120,
  addressMax: 400,
  diagnosisMax: 600,
  notesMax: 4000,
  noteMax: 400,
  treatmentMax: 600,
  sessionsMax: 500,
  // A single fee or payment above this is almost certainly a typo (₹20 lakh).
  moneyMax: 2000000,
  durationMin: 5,
  durationMax: 480,
};

/* ------------------------------------------------------------- primitives */

const text = (v) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());
const present = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

/* Letters (any script), spaces, and the punctuation that legitimately appears
   in names. Notably NO digits — "Rahul 2" is a data-entry slip, not a name. */
const NAME_RE = /^[\p{L}][\p{L}\s.'-]*$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* Indian mobile numbers. Accepts the ways people actually type them —
   "9876543210", "+91 98765 43210", "09876543210", "091-9876543210" — and
   normalises all of them to the bare 10 digits. Anything containing a letter is
   rejected outright rather than silently stripped. */
export function normalizePhone(raw) {
  const value = text(raw);
  if (!value) return { ok: false, reason: "Mobile number is required.", value: "" };

  if (/[a-zA-Z]/.test(value)) {
    return { ok: false, reason: "Mobile number cannot contain letters.", value };
  }
  if (/[^\d\s+()-]/.test(value)) {
    return {
      ok: false,
      reason: "Mobile number can only contain digits (spaces, +, - and brackets are fine).",
      value,
    };
  }

  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);

  if (digits.length !== 10) {
    return {
      ok: false,
      reason: `An Indian mobile number has 10 digits — you entered ${digits.length}.`,
      value,
    };
  }
  if (!/^[6-9]/.test(digits)) {
    return { ok: false, reason: "An Indian mobile number starts with 6, 7, 8 or 9.", value };
  }

  return { ok: true, value: digits };
}

export const formatPhone = (digits) => {
  const d = text(digits).replace(/\D/g, "");
  return d.length === 10 ? `${d.slice(0, 5)} ${d.slice(5)}` : text(digits);
};

function checkName(value, label = "Name") {
  const name = text(value);
  if (!name) return { error: `${label} is required.` };
  if (name.length < LIMITS.nameMin) return { error: `${label} is too short.` };
  if (name.length > LIMITS.nameMax) return { error: `${label} must be under ${LIMITS.nameMax} characters.` };
  if (/\d/.test(name)) return { error: `${label} cannot contain numbers.` };
  if (!NAME_RE.test(name)) return { error: `${label} contains characters that aren't allowed.` };
  return { value: name };
}

function checkInt(value, { min, max, label, required = false }) {
  if (value === "" || value == null) {
    return required ? { error: `${label} is required.` } : { value: null };
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return { error: `${label} must be a number.` };
  if (!Number.isInteger(n)) return { error: `${label} must be a whole number.` };
  if (n < min || n > max) return { error: `${label} must be between ${min} and ${max}.` };
  return { value: n };
}

function checkMoney(value, { label, required = false, allowZero = true }) {
  if (value === "" || value == null) {
    return required ? { error: `${label} is required.` } : { value: 0 };
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return { error: `${label} must be a number.` };
  if (n < 0) return { error: `${label} cannot be negative.` };
  if (!allowZero && n <= 0) return { error: `${label} must be greater than zero.` };
  if (n > LIMITS.moneyMax) {
    return { error: `${label} looks too large — check for an extra digit.` };
  }
  return { value: Math.round(n * 100) / 100 };
}

function checkDate(value, { label, required = false }) {
  if (!value) return required ? { error: `${label} is required.` } : { value: null };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { error: `${label} is not a valid date.` };
  const year = d.getFullYear();
  if (year < 1900 || year > 2200) return { error: `${label} is out of range.` };
  return { value: d };
}

function checkEnum(value, allowed, { label, fallback }) {
  const v = text(value);
  if (!v) return { value: fallback };
  if (!allowed.includes(v)) return { error: `${label} is not a valid option.` };
  return { value: v };
}

function checkLength(value, max, label) {
  const v = text(value);
  if (v.length > max) return { error: `${label} must be under ${max} characters.` };
  return { value: v };
}

/* Collects results into { values, errors } without repeating the plumbing. */
function collector() {
  const values = {};
  const errors = {};
  return {
    values,
    errors,
    take(field, result, target = values) {
      if (result.error) errors[field] = result.error;
      else target[field] = result.value;
    },
    get ok() {
      return Object.keys(errors).length === 0;
    },
  };
}

/* --------------------------------------------------------------- patient */

export function validatePatient(input = {}, { partial = false } = {}) {
  const c = collector();
  const want = (key) => !partial || present(input, key);

  if (want("name")) c.take("name", checkName(input.name, "Patient name"));

  if (want("phone")) {
    const phone = normalizePhone(input.phone);
    if (!phone.ok) c.errors.phone = phone.reason;
    else c.values.phone = phone.value;
  }

  if (want("email")) {
    const email = text(input.email).toLowerCase();
    if (email && !EMAIL_RE.test(email)) c.errors.email = "That doesn't look like a valid email address.";
    else c.values.email = email;
  }

  if (want("age")) {
    c.take("age", checkInt(input.age, { min: 0, max: LIMITS.ageMax, label: "Age" }));
  }
  if (want("gender")) {
    c.take("gender", checkEnum(input.gender, GENDERS, { label: "Gender", fallback: "undisclosed" }));
  }
  if (want("status")) {
    c.take("status", checkEnum(input.status, PATIENT_STATUSES, { label: "Status", fallback: "active" }));
  }
  if (want("address")) c.take("address", checkLength(input.address, LIMITS.addressMax, "Address"));
  if (want("diagnosis")) c.take("diagnosis", checkLength(input.diagnosis, LIMITS.diagnosisMax, "Diagnosis"));
  if (want("notes")) c.take("notes", checkLength(input.notes, LIMITS.notesMax, "Notes"));

  if (want("city")) {
    const city = text(input.city) || "Surat";
    if (/\d/.test(city)) c.errors.city = "City cannot contain numbers.";
    else if (city.length > 80) c.errors.city = "City name is too long.";
    else c.values.city = city;
  }

  if (want("referredBy")) {
    const ref = text(input.referredBy);
    // Optional, but if given it's a person or clinic — same rule as a name.
    if (ref) c.take("referredBy", checkName(ref, "Referred by"));
    else c.values.referredBy = "";
  }

  if (want("complaintAreas")) {
    if (input.complaintAreas != null && !Array.isArray(input.complaintAreas)) {
      c.errors.complaintAreas = "Complaint areas must be a list.";
    } else {
      c.values.complaintAreas = (input.complaintAreas || [])
        .map((v) => text(v))
        .filter(Boolean)
        .slice(0, 25);
    }
  }

  /* ---- treatment plan ---- */
  const planInput = input.plan && typeof input.plan === "object" ? input.plan : null;
  const plan = {};

  if (planInput || !partial) {
    const p = planInput || {};
    const wantPlan = (key) => !partial || present(p, key);
    const planErrors = {};
    const takePlan = (field, result) => {
      if (result.error) planErrors[field] = result.error;
      else plan[field] = result.value;
    };

    if (wantPlan("packageName")) takePlan("packageName", checkLength(p.packageName, 160, "Package name"));
    if (wantPlan("totalSessions")) {
      takePlan(
        "totalSessions",
        checkInt(p.totalSessions === "" ? 0 : p.totalSessions, {
          min: 0,
          max: LIMITS.sessionsMax,
          label: "Planned sessions",
        })
      );
      if (plan.totalSessions == null) plan.totalSessions = 0;
    }
    if (wantPlan("feeTotal")) takePlan("feeTotal", checkMoney(p.feeTotal, { label: "Total fee" }));
    if (wantPlan("installmentAmount")) {
      takePlan("installmentAmount", checkMoney(p.installmentAmount, { label: "Instalment amount" }));
    }
    if (wantPlan("startedAt")) takePlan("startedAt", checkDate(p.startedAt, { label: "Start date" }));

    // Cross-field rule: an instalment bigger than the whole fee is nonsense.
    if (
      !planErrors.installmentAmount &&
      !planErrors.feeTotal &&
      plan.installmentAmount > 0 &&
      plan.feeTotal > 0 &&
      plan.installmentAmount > plan.feeTotal
    ) {
      planErrors.installmentAmount = "Instalment cannot be larger than the total fee.";
    }

    for (const [field, message] of Object.entries(planErrors)) {
      c.errors[`plan.${field}`] = message;
    }
  }

  return { values: c.values, plan, errors: c.errors };
}

/* --------------------------------------------------------------- session */

export function validateSession(input = {}, { partial = false } = {}) {
  const c = collector();
  const want = (key) => !partial || present(input, key);

  if (want("scheduledAt")) {
    c.take("scheduledAt", checkDate(input.scheduledAt, { label: "Session date and time", required: true }));
  }
  if (want("durationMin")) {
    const result = checkInt(input.durationMin === "" ? 45 : input.durationMin, {
      min: LIMITS.durationMin,
      max: LIMITS.durationMax,
      label: "Duration",
    });
    c.take("durationMin", result.value == null && !result.error ? { value: 45 } : result);
  }
  if (want("status")) {
    c.take("status", checkEnum(input.status, SESSION_STATUSES, { label: "Status", fallback: "scheduled" }));
  }
  if (want("therapist")) c.take("therapist", checkLength(input.therapist, 160, "Therapist"));
  if (want("treatment")) c.take("treatment", checkLength(input.treatment, LIMITS.treatmentMax, "Treatment"));
  if (want("notes")) c.take("notes", checkLength(input.notes, LIMITS.notesMax, "Notes"));
  if (want("painScore")) {
    c.take("painScore", checkInt(input.painScore, { min: 0, max: 10, label: "Pain score" }));
  }

  /* ---- home visits ---- */
  if (want("visitType")) {
    c.take("visitType", checkEnum(input.visitType, VISIT_TYPES, { label: "Visit type", fallback: "clinic" }));
  }
  if (want("visitAddress")) {
    c.take("visitAddress", checkLength(input.visitAddress, LIMITS.addressMax, "Visit address"));
  }
  if (want("travelFee")) c.take("travelFee", checkMoney(input.travelFee, { label: "Travel charge" }));

  // A home visit without an address is a booking nobody can actually attend.
  if (c.values.visitType === "home" && present(c.values, "visitAddress") && !c.values.visitAddress) {
    c.errors.visitAddress = "A home visit needs an address.";
  }

  return { values: c.values, errors: c.errors };
}

/* --------------------------------------------------------------- payment */

export function validatePayment(input = {}, { partial = false } = {}) {
  const c = collector();
  const want = (key) => !partial || present(input, key);

  if (want("amount")) {
    c.take("amount", checkMoney(input.amount, { label: "Amount", required: true, allowZero: false }));
  }
  if (want("method")) {
    c.take("method", checkEnum(input.method, PAYMENT_METHODS, { label: "Method", fallback: "cash" }));
  }
  if (want("paidAt")) {
    const result = checkDate(input.paidAt, { label: "Payment date" });
    c.take("paidAt", result.value == null && !result.error ? { value: new Date() } : result);
  }
  if (want("note")) c.take("note", checkLength(input.note, LIMITS.noteMax, "Note"));

  return { values: c.values, errors: c.errors };
}

/* --------------------------------------------------------------- expense */

export function validateExpense(input = {}, { partial = false } = {}) {
  const c = collector();
  const want = (key) => !partial || present(input, key);

  if (want("amount")) {
    c.take("amount", checkMoney(input.amount, { label: "Amount", required: true, allowZero: false }));
  }
  if (want("category")) {
    c.take("category", checkEnum(input.category, EXPENSE_CATEGORIES, { label: "Category", fallback: "other" }));
  }
  if (want("date")) {
    const result = checkDate(input.date, { label: "Expense date" });
    c.take("date", result.value == null && !result.error ? { value: new Date() } : result);
  }
  if (want("description")) {
    c.take("description", checkLength(input.description, LIMITS.diagnosisMax, "Description"));
  }

  return { values: c.values, errors: c.errors };
}

/* --------------------------------------------------------------- package */

export function validatePackage(input = {}, { partial = false } = {}) {
  const c = collector();
  const want = (key) => !partial || present(input, key);

  if (want("name")) c.take("name", checkLength(input.name, 160, "Package name"));
  if (!partial && !c.values.name) c.errors.name = "Package name is required.";

  if (want("kind")) {
    c.take("kind", checkEnum(input.kind, PACKAGE_KINDS, { label: "Package type", fallback: "clinic" }));
  }
  if (want("sessions")) {
    c.take(
      "sessions",
      checkInt(input.sessions === "" ? 0 : input.sessions, {
        min: 0,
        max: LIMITS.sessionsMax,
        label: "Sessions",
      })
    );
    if (c.values.sessions == null) c.values.sessions = 0;
  }
  if (want("fee")) c.take("fee", checkMoney(input.fee, { label: "Fee" }));
  if (want("installmentAmount")) {
    c.take("installmentAmount", checkMoney(input.installmentAmount, { label: "Instalment amount" }));
  }
  if (want("description")) {
    c.take("description", checkLength(input.description, LIMITS.diagnosisMax, "Description"));
  }
  // A newly created package is on sale unless it is explicitly switched off —
  // defaulting to Boolean(undefined) would file every new package as inactive
  // and keep it out of the picker on the patient form.
  if (want("active")) c.values.active = input.active == null ? true : Boolean(input.active);

  if (
    !c.errors.installmentAmount &&
    !c.errors.fee &&
    c.values.installmentAmount > 0 &&
    c.values.fee > 0 &&
    c.values.installmentAmount > c.values.fee
  ) {
    c.errors.installmentAmount = "Instalment cannot be larger than the package fee.";
  }

  return { values: c.values, errors: c.errors };
}

/* -------------------------------------------------------- clinic settings */

const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateClinicSettings(input = {}) {
  const c = collector();

  c.take("clinicName", checkLength(input.clinicName, 120, "Clinic name"));
  if (!c.values.clinicName) c.errors.clinicName = "Clinic name is required.";

  c.take("therapistName", checkLength(input.therapistName, 120, "Therapist name"));
  c.take("clinicAddress", checkLength(input.clinicAddress, LIMITS.addressMax, "Clinic address"));
  c.take("receiptFooter", checkLength(input.receiptFooter, LIMITS.noteMax, "Receipt footer"));

  const phone = text(input.clinicPhone);
  if (phone && /[a-zA-Z]/.test(phone)) c.errors.clinicPhone = "Clinic phone cannot contain letters.";
  else c.values.clinicPhone = phone;

  const email = text(input.clinicEmail).toLowerCase();
  if (email && !EMAIL_RE.test(email)) c.errors.clinicEmail = "That doesn't look like a valid email address.";
  else c.values.clinicEmail = email;

  const prefix = text(input.receiptPrefix).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!prefix) c.errors.receiptPrefix = "Receipt prefix is required (letters and digits only).";
  else if (prefix.length > 10) c.errors.receiptPrefix = "Receipt prefix must be 10 characters or fewer.";
  else c.values.receiptPrefix = prefix;

  c.take("slotMinutes", checkInt(input.slotMinutes, { min: 10, max: 120, label: "Calendar slot size" }));
  if (c.values.slotMinutes == null) c.values.slotMinutes = 30;

  c.take(
    "defaultDurationMin",
    checkInt(input.defaultDurationMin, {
      min: LIMITS.durationMin,
      max: LIMITS.durationMax,
      label: "Default session length",
    })
  );
  if (c.values.defaultDurationMin == null) c.values.defaultDurationMin = 45;

  /* ---- working hours: one entry per weekday ---- */
  const hours = [];
  const rows = Array.isArray(input.workingHours) ? input.workingHours : [];
  for (const row of rows) {
    const day = Number(row?.day);
    if (!Number.isInteger(day) || day < 0 || day > 6) continue;

    const open = text(row.open);
    const close = text(row.close);
    const closed = Boolean(row.closed);

    if (!closed) {
      if (!TIME_RE.test(open)) {
        c.errors[`hours.${day}`] = "Opening time must look like 09:00.";
        continue;
      }
      if (!TIME_RE.test(close)) {
        c.errors[`hours.${day}`] = "Closing time must look like 19:00.";
        continue;
      }
      const [oh, om] = open.split(":").map(Number);
      const [ch, cm] = close.split(":").map(Number);
      if (ch * 60 + cm <= oh * 60 + om) {
        c.errors[`hours.${day}`] = "Closing time must be after opening time.";
        continue;
      }
    }

    hours.push({ day, open: open || "09:00", close: close || "19:00", closed });
  }
  c.values.workingHours = hours;

  /* ---- holidays ---- */
  const holidays = [];
  const seen = new Set();
  for (const row of Array.isArray(input.holidays) ? input.holidays : []) {
    const date = text(row?.date);
    if (!DATE_KEY_RE.test(date)) {
      c.errors.holidays = "Each holiday needs a valid date.";
      continue;
    }
    if (seen.has(date)) continue;
    seen.add(date);
    holidays.push({ date, label: text(row.label).slice(0, 120) });
  }
  holidays.sort((a, b) => a.date.localeCompare(b.date));
  c.values.holidays = holidays;

  return { values: c.values, errors: c.errors };
}
