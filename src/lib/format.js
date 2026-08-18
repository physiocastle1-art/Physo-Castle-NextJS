/* Pure formatting helpers — safe to import from both server and client
   components (no next/headers, no database).

   Everything is rendered in the clinic's own timezone rather than "whatever
   timezone the machine happens to be in". That keeps a server-rendered time
   identical to the same time re-rendered in the browser (no hydration
   mismatch), and means a deploy on a UTC host still shows IST appointment
   times. */
export const CLINIC_TZ = "Asia/Kolkata";
const CLINIC_UTC_OFFSET = "+05:30";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export const formatMoney = (n) => inr.format(Number(n) || 0);

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: CLINIC_TZ,
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: CLINIC_TZ,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const timeFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: CLINIC_TZ,
  hour: "numeric",
  minute: "2-digit",
});

const asDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export function formatDate(value) {
  const d = asDate(value);
  return d ? dateFmt.format(d) : "—";
}

export function formatDateTime(value) {
  const d = asDate(value);
  return d ? dateTimeFmt.format(d) : "—";
}

export function formatTime(value) {
  const d = asDate(value);
  return d ? timeFmt.format(d) : "—";
}

/* Stored instant → the "YYYY-MM-DDTHH:mm" a datetime-local input expects,
   expressed in clinic time. */
export function toDateTimeInput(value) {
  const d = asDate(value);
  if (!d) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);

  const get = (type) => parts.find((p) => p.type === type)?.value || "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/* Stored instant → the "YYYY-MM-DD" a date input expects, in clinic time. */
export function toDateInput(value) {
  const iso = toDateTimeInput(value);
  return iso ? iso.slice(0, 10) : "";
}

/* The inverse: a timezone-naive input value becomes an unambiguous instant.
   Without this, "10:00" typed by the user would be read as 10:00 in the
   server's timezone — 15:30 IST on a UTC host. */
export function fromDateTimeInput(value) {
  if (!value) return null;
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  return `${withSeconds}${CLINIC_UTC_OFFSET}`;
}

export function fromDateInput(value) {
  if (!value) return null;
  return `${value}T00:00:00${CLINIC_UTC_OFFSET}`;
}

/* Day and month boundaries in clinic time, so "sessions today" and "collected
   this month" mean the clinic's today/month even when the server runs in UTC. */
export function clinicDayStart(now = new Date()) {
  return new Date(`${toDateInput(now)}T00:00:00${CLINIC_UTC_OFFSET}`);
}

export function clinicMonthStart(now = new Date()) {
  return new Date(`${toDateInput(now).slice(0, 7)}-01T00:00:00${CLINIC_UTC_OFFSET}`);
}

export const DAY_MS = 24 * 60 * 60 * 1000;

export const SESSION_STATUS_LABEL = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
};

export const PATIENT_STATUS_LABEL = {
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
  inactive: "Inactive",
};

export const PAYMENT_METHOD_LABEL = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  bank_transfer: "Bank transfer",
  cheque: "Cheque",
  other: "Other",
};

export const GENDER_LABEL = {
  female: "Female",
  male: "Male",
  other: "Other",
  undisclosed: "Not disclosed",
};

export const VISIT_TYPE_LABEL = {
  clinic: "At clinic",
  home: "Home visit",
};

export const EXPENSE_CATEGORY_LABEL = {
  travel_home_visit: "Travel (home visits)",
  clinic_rent: "Clinic rent",
  medical_consumables: "Consumables",
  software_sub: "Software",
  equipment: "Equipment",
  salaries: "Salaries",
  utilities: "Utilities",
  marketing: "Marketing",
  other: "Other",
};

export const PACKAGE_KIND_LABEL = {
  clinic: "Clinic package",
  home_visit: "Home visit package",
  assessment: "Assessment",
  other: "Other",
};

/* "2026-04" → "Apr 2026", for the month-by-month finance tables. */
const monthFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: CLINIC_TZ,
  month: "short",
  year: "numeric",
});

export function formatMonthKey(key) {
  if (!/^\d{4}-\d{2}$/.test(String(key || ""))) return "—";
  return monthFmt.format(new Date(`${key}-01T12:00:00${CLINIC_UTC_OFFSET}`));
}

/* The first instant of the month N months before the current clinic month. */
export function clinicMonthsAgo(months, now = new Date()) {
  const key = toDateInput(now).slice(0, 7);
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  const total = year * 12 + (month - 1) - months;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return new Date(`${y}-${String(m).padStart(2, "0")}-01T00:00:00${CLINIC_UTC_OFFSET}`);
}
