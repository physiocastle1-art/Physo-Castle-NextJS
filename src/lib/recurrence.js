/* Turning "12 sessions, Mon/Wed/Fri at 5:30pm, starting Monday" into a list of
   appointments.

   Pure module, and deliberately so: the booking form shows the caller exactly
   the dates the API is about to create, because both sides call
   generateOccurrences() with the same arguments and get the same answer. */

import {
  addDays,
  dateKeyOf,
  formatDateKey,
  holidayOn,
  hoursForDate,
  instantAt,
  isDateKey,
  minutesOfTime,
  weekdayOf,
  withDefaults,
} from "./hours.js";

export const BULK_MAX = 60;

// How far forward the generator will look for matching weekdays before giving
// up. Well beyond BULK_MAX weekly slots, so it only ever stops a caller who
// asked for something impossible (no weekdays selected, every day a holiday).
const SEARCH_DAYS = 400;

/* Every occurrence comes back annotated rather than filtered, so the form can
   show "3 fall on holidays" instead of silently producing fewer sessions than
   were asked for. `skipped` entries never become bookings. */
export function generateOccurrences({
  startDate,
  time = "10:00",
  weekdays = [],
  count = 1,
  settings = {},
  skipHolidays = true,
} = {}) {
  const errors = {};

  const start = isDateKey(startDate) ? startDate : dateKeyOf(startDate);
  if (!isDateKey(start)) errors.startDate = "Pick a start date.";

  if (minutesOfTime(time) == null) errors.time = "Enter a time as HH:mm.";

  const days = [...new Set((weekdays || []).map(Number).filter((d) => d >= 0 && d <= 6))].sort();
  if (!days.length) errors.weekdays = "Choose at least one day of the week.";

  const wanted = Math.floor(Number(count) || 0);
  if (!wanted || wanted < 1) errors.count = "How many sessions?";
  else if (wanted > BULK_MAX) errors.count = `That's more than ${BULK_MAX} sessions in one go.`;

  if (Object.keys(errors).length) return { occurrences: [], skipped: [], errors };

  const s = withDefaults(settings);
  const occurrences = [];
  const skipped = [];

  let key = start;
  for (let step = 0; step < SEARCH_DAYS && occurrences.length < wanted; step += 1, key = addDays(key, 1)) {
    if (!days.includes(weekdayOf(key))) continue;

    const holiday = holidayOn(s, key);
    if (holiday && skipHolidays) {
      skipped.push({
        key,
        label: formatDateKey(key),
        reason: holiday.label ? `Holiday — ${holiday.label}` : "Holiday",
      });
      continue;
    }

    const day = hoursForDate(s, key);
    const open = minutesOfTime(day.open);
    const close = minutesOfTime(day.close);
    const at = minutesOfTime(time);
    const outsideHours =
      day.closed || open == null || close == null || at < open || at + Number(s.defaultDurationMin) > close;

    occurrences.push({
      key,
      label: formatDateKey(key),
      time,
      scheduledAt: instantAt(key, time),
      outsideHours: Boolean(outsideHours),
      holiday: holiday || null,
    });
  }

  if (occurrences.length < wanted) {
    errors.count = `Only ${occurrences.length} of ${wanted} dates could be placed — widen the days or turn off "skip holidays".`;
  }

  return { occurrences, skipped, errors };
}
