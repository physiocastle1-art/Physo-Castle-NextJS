/* Clinic opening hours, holidays, and the calendar-date arithmetic the schedule
   is built on.

   Pure module — the bulk-booking form previews exactly the dates the API will
   create, because both call the functions in here.

   A "date key" is the string "YYYY-MM-DD" in clinic time. Working in keys
   rather than Date objects is what keeps a day from drifting: adding 24 hours to
   an instant is not the same as moving to tomorrow, but incrementing a key
   always is. */

import { toDateInput, toDateTimeInput, fromDateTimeInput, CLINIC_TZ } from "./format.js";
import { WEEKDAYS } from "./enums.js";

const pad = (n) => String(n).padStart(2, "0");

export const WEEKDAY_LABEL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* An instant → the clinic-time calendar date it falls on. */
export const dateKeyOf = (value) => toDateInput(value);

export const isDateKey = (key) => /^\d{4}-\d{2}-\d{2}$/.test(String(key || ""));

export function todayKey() {
  return toDateInput(new Date());
}

/* Calendar arithmetic done in UTC on the date parts alone, so it is unaffected
   by whatever timezone the server runs in. */
export function addDays(key, days) {
  const [y, m, d] = String(key).split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) + days * 86400000;
  const dt = new Date(t);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function weekdayOf(key) {
  const [y, m, d] = String(key).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/* Monday-first week, because that is how a clinic week reads. */
export function weekStart(key) {
  const wd = weekdayOf(key);
  return addDays(key, wd === 0 ? -6 : 1 - wd);
}

export function rangeOfKeys(startKey, days) {
  return Array.from({ length: days }, (_, i) => addDays(startKey, i));
}

const dayLabelFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: CLINIC_TZ,
  weekday: "short",
  day: "2-digit",
  month: "short",
});

export function formatDateKey(key) {
  if (!isDateKey(key)) return "—";
  return dayLabelFmt.format(new Date(`${key}T12:00:00+05:30`));
}

/* --------------------------------------------------------- time of day */

/* "HH:mm" → minutes past midnight, or null when it isn't a time. */
export function minutesOfTime(value) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value || "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function timeOfMinutes(total) {
  const t = Math.max(0, Math.min(24 * 60, Math.round(total)));
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
}

export function formatSlotLabel(total) {
  const t = Math.max(0, Math.round(total));
  const h24 = Math.floor(t / 60) % 24;
  const min = t % 60;
  const suffix = h24 >= 12 ? "pm" : "am";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return min === 0 ? `${h12} ${suffix}` : `${h12}:${pad(min)} ${suffix}`;
}

/* An instant → its clinic-time minutes past midnight. */
export function minutesOfInstant(value) {
  const iso = toDateTimeInput(value);
  return iso ? minutesOfTime(iso.slice(11, 16)) : null;
}

/* A calendar date + "HH:mm" → the unambiguous instant, in clinic time. */
export function instantAt(key, time) {
  return fromDateTimeInput(`${key}T${time}`);
}

/* ------------------------------------------------------- settings shape */

export function defaultWorkingHours() {
  return WEEKDAYS.map((day) => ({
    day,
    open: "09:00",
    close: "19:00",
    // Sunday closed is the usual default for a clinic here; every day is
    // editable, this is only what an unconfigured clinic starts from.
    closed: day === 0,
  }));
}

export const DEFAULT_CLINIC_SETTINGS = {
  clinicName: "Physio Castle",
  therapistName: "Dr. Riddhi Shah (PT)",
  clinicAddress: "Surat, Gujarat",
  clinicPhone: "",
  clinicEmail: "",
  receiptPrefix: "PC",
  receiptFooter: "Thank you for choosing Physio Castle for your recovery journey.",
  slotMinutes: 30,
  defaultDurationMin: 45,
  workingHours: defaultWorkingHours(),
  holidays: [],
};

/* Fills in anything a stored settings row is missing, so callers never have to
   check whether a weekday exists before reading it. */
export function withDefaults(settings = {}) {
  const stored = Array.isArray(settings.workingHours) ? settings.workingHours : [];
  const byDay = new Map(stored.map((h) => [Number(h.day), h]));

  return {
    ...DEFAULT_CLINIC_SETTINGS,
    ...settings,
    slotMinutes: Number(settings.slotMinutes) || DEFAULT_CLINIC_SETTINGS.slotMinutes,
    defaultDurationMin:
      Number(settings.defaultDurationMin) || DEFAULT_CLINIC_SETTINGS.defaultDurationMin,
    workingHours: defaultWorkingHours().map((fallback) => {
      const found = byDay.get(fallback.day);
      if (!found) return fallback;
      return {
        day: fallback.day,
        open: minutesOfTime(found.open) == null ? fallback.open : found.open,
        close: minutesOfTime(found.close) == null ? fallback.close : found.close,
        closed: Boolean(found.closed),
      };
    }),
    holidays: (Array.isArray(settings.holidays) ? settings.holidays : [])
      .filter((h) => isDateKey(h?.date))
      .map((h) => ({ date: h.date, label: h.label || "" })),
  };
}

export function holidayOn(settings, key) {
  return withDefaults(settings).holidays.find((h) => h.date === key) || null;
}

export function hoursForDate(settings, key) {
  const s = withDefaults(settings);
  const holiday = s.holidays.find((h) => h.date === key);
  const day = s.workingHours[weekdayOf(key)];

  if (holiday) return { ...day, closed: true, holiday };
  return { ...day, holiday: null };
}

/* The earliest open and latest close across a set of days — the vertical extent
   the calendar grid has to draw. Falls back to a sane window when every day in
   view is closed, so the grid is never zero rows tall. */
export function gridWindow(settings, keys) {
  let from = null;
  let to = null;

  for (const key of keys) {
    const day = hoursForDate(settings, key);
    if (day.closed) continue;
    const open = minutesOfTime(day.open);
    const close = minutesOfTime(day.close);
    if (open == null || close == null || close <= open) continue;
    from = from == null ? open : Math.min(from, open);
    to = to == null ? close : Math.max(to, close);
  }

  if (from == null || to == null) return { from: 9 * 60, to: 19 * 60 };
  return { from, to };
}

/* ------------------------------------------------- the off-hours check */

/* Returns { ok, reason } rather than throwing, because the same answer is used
   two different ways: the API refuses the booking, the bulk-booking preview
   just flags the row in amber. */
export function checkWithinHours(settings, startInstant, durationMin = 45) {
  const key = dateKeyOf(startInstant);
  if (!key) return { ok: false, reason: "That date could not be read." };

  const day = hoursForDate(settings, key);
  if (day.holiday) {
    return {
      ok: false,
      reason: `${formatDateKey(key)} is marked as a holiday${day.holiday.label ? ` (${day.holiday.label})` : ""}.`,
    };
  }
  if (day.closed) {
    return { ok: false, reason: `The clinic is closed on ${WEEKDAY_LABEL[weekdayOf(key)]}s.` };
  }

  const open = minutesOfTime(day.open);
  const close = minutesOfTime(day.close);
  const start = minutesOfInstant(startInstant);
  if (open == null || close == null || start == null) {
    return { ok: false, reason: "Working hours for that day are not set correctly." };
  }

  const end = start + (Number(durationMin) || 0);
  if (start < open || end > close) {
    return {
      ok: false,
      reason: `Outside clinic hours on ${formatDateKey(key)} (${formatSlotLabel(open)}–${formatSlotLabel(close)}).`,
    };
  }

  return { ok: true, reason: "" };
}
