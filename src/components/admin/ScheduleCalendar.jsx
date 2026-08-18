import Link from "next/link";
import {
  formatDateKey,
  formatSlotLabel,
  gridWindow,
  hoursForDate,
  minutesOfInstant,
  minutesOfTime,
  todayKey,
  weekdayOf,
  WEEKDAY_SHORT,
} from "@/lib/hours";
import { formatTime } from "@/lib/format";

/* The week at a glance, as a grid rather than a list.

   A list tells you what is booked. A grid tells you what is *not* — which is
   the question you are actually asking when a patient rings up wanting a slot
   on Thursday. */

// Vertical scale. 1.15px per minute puts a ten-hour clinic day at roughly 690px
// — tall enough that a 30-minute session is a readable block, short enough that
// a working day still fits one screen.
const PX_PER_MIN = 1.15;

/* Sessions that overlap in time are laid out side by side. Bookings for one
   therapist can't overlap (the API refuses it), so this only ever fires when a
   second therapist is working the same hour — but when it does, one block
   hidden underneath another would be a booking nobody sees. */
function packLanes(sessions) {
  const placed = [];
  const laneEnds = [];

  for (const session of sessions) {
    const start = minutesOfInstant(session.scheduledAt);
    if (start == null) continue;
    const end = start + (Number(session.durationMin) || 45);

    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }

    placed.push({ session, start, end, lane });
  }

  return { placed, lanes: Math.max(1, laneEnds.length) };
}

const TONE = {
  scheduled: "blue",
  completed: "green",
  cancelled: "grey",
  no_show: "red",
};

export default function ScheduleCalendar({ settings, byDay = {}, keys = [] }) {
  const { from, to } = gridWindow(settings, keys);
  const slot = Number(settings.slotMinutes) || 30;
  const bodyHeight = (to - from) * PX_PER_MIN;
  const today = todayKey();

  // Hour lines every slot, but only labelled on the hour — a 15-minute clinic
  // would otherwise produce an unreadable gutter.
  const gridLines = [];
  for (let minute = from; minute <= to; minute += slot) gridLines.push(minute);

  return (
    <div className="adm-cal">
      <div className="adm-cal-head" style={{ "--cal-cols": keys.length }}>
        <div className="adm-cal-gutter-head" />
        {keys.map((key) => {
          const day = hoursForDate(settings, key);
          return (
            <div key={key} className={`adm-cal-day-head${key === today ? " is-today" : ""}`}>
              <span className="adm-cal-dow">{WEEKDAY_SHORT[weekdayOf(key)]}</span>
              <strong>{formatDateKey(key).replace(/^\w+,?\s*/, "")}</strong>
              <span className="adm-cal-hours">
                {day.holiday
                  ? day.holiday.label || "Holiday"
                  : day.closed
                    ? "Closed"
                    : `${formatSlotLabel(minutesOfTime(day.open))} – ${formatSlotLabel(minutesOfTime(day.close))}`}
              </span>
            </div>
          );
        })}
      </div>

      <div className="adm-cal-body" style={{ "--cal-cols": keys.length, height: `${bodyHeight}px` }}>
        <div className="adm-cal-gutter">
          {gridLines.map((minute) => (
            <div
              key={minute}
              className="adm-cal-tick"
              style={{ top: `${(minute - from) * PX_PER_MIN}px` }}
            >
              {minute % 60 === 0 ? formatSlotLabel(minute) : ""}
            </div>
          ))}
        </div>

        {keys.map((key) => {
          const day = hoursForDate(settings, key);
          const open = minutesOfTime(day.open);
          const close = minutesOfTime(day.close);
          const { placed, lanes } = packLanes(byDay[key] || []);

          return (
            <div key={key} className={`adm-cal-col${key === today ? " is-today" : ""}`}>
              {gridLines.map((minute) => (
                <div
                  key={minute}
                  className="adm-cal-line"
                  style={{ top: `${(minute - from) * PX_PER_MIN}px` }}
                />
              ))}

              {/* Everything outside opening hours is shaded rather than removed,
                  so an out-of-hours booking is still visible where it sits. */}
              {day.closed ? (
                <div className="adm-cal-closed" style={{ top: 0, height: `${(to - from) * PX_PER_MIN}px` }}>
                  <span>{day.holiday ? day.holiday.label || "Holiday" : "Closed"}</span>
                </div>
              ) : (
                <>
                  {open > from ? (
                    <div className="adm-cal-closed" style={{ top: 0, height: `${(open - from) * PX_PER_MIN}px` }} />
                  ) : null}
                  {close < to ? (
                    <div
                      className="adm-cal-closed"
                      style={{ top: `${(close - from) * PX_PER_MIN}px`, height: `${(to - close) * PX_PER_MIN}px` }}
                    />
                  ) : null}
                </>
              )}

              {placed.map(({ session, start, end, lane }) => {
                const top = (start - from) * PX_PER_MIN;
                const height = Math.max(18, (end - start) * PX_PER_MIN - 2);
                const width = 100 / lanes;

                return (
                  <Link
                    key={session._id}
                    href={session.patient ? `/admin/patients/${session.patient.slug}` : "/admin/schedule"}
                    className={`adm-cal-event ${TONE[session.status] || "grey"}`}
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      left: `calc(${lane * width}% + 3px)`,
                      width: `calc(${width}% - 6px)`,
                    }}
                    title={`${formatTime(session.scheduledAt)} · ${session.patient?.name || "Deleted patient"} · visit #${session.number} · ${session.durationMin} min${session.therapist ? ` · ${session.therapist}` : ""}`}
                  >
                    <span className="adm-cal-event-time">
                      {formatTime(session.scheduledAt)}
                      {session.visitType === "home" ? <span title="Home visit"> ⌂</span> : null}
                    </span>
                    <span className="adm-cal-event-name">
                      {session.patient?.name || "Deleted patient"}
                    </span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
