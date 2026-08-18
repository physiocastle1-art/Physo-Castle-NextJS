import Link from "next/link";
import { getCalendarDays, getClinicSettings, getHomeVisits, listSessions } from "@/lib/clinic";
import { formatDateTime, formatTime, formatMoney, SESSION_STATUS_LABEL } from "@/lib/format";
import { addDays, formatDateKey, isDateKey, rangeOfKeys, todayKey, weekStart } from "@/lib/hours";
import { sessionReminderText } from "@/lib/whatsapp";
import { Card, Empty, PageHeader, SessionBadge, Stat } from "@/components/admin/ui";
import ScheduleCalendar from "@/components/admin/ScheduleCalendar";
import WhatsAppButton from "@/components/admin/WhatsAppButton";

export const metadata = { title: "Schedule — Physio Castle Admin" };

const VIEWS = [
  { key: "week", label: "Week" },
  { key: "day", label: "Day" },
  { key: "list", label: "List" },
  { key: "route", label: "Home visits" },
];

const RANGES = [
  { key: "today", label: "Today" },
  { key: "week", label: "Next 7 days" },
  { key: "upcoming", label: "All upcoming" },
  { key: "past", label: "Past" },
];

export default async function SchedulePage({ searchParams }) {
  const view = VIEWS.some((v) => v.key === searchParams?.view) ? searchParams.view : "week";

  // The anchor date drives every calendar view. Week snaps to Monday; day and
  // route use the date itself.
  const anchor = isDateKey(searchParams?.date) ? searchParams.date : todayKey();
  const settings = await getClinicSettings();

  const link = (patch) => {
    const params = new URLSearchParams();
    const merged = { view, date: anchor, ...patch };
    if (merged.view && merged.view !== "week") params.set("view", merged.view);
    if (merged.date && merged.date !== todayKey()) params.set("date", merged.date);
    if (merged.status) params.set("status", merged.status);
    if (merged.range) params.set("range", merged.range);
    if (merged.page && merged.page > 1) params.set("page", String(merged.page));
    return `/admin/schedule${params.size ? `?${params}` : ""}`;
  };

  const switcher = (
    <Card>
      <div className="adm-inline">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={link({ view: v.key, page: 1, status: "", range: "" })}
            className={`adm-btn adm-btn-sm ${view === v.key ? "adm-btn-primary" : "adm-btn-ghost"}`}
          >
            {v.label}
          </Link>
        ))}
        <span className="adm-sep" style={{ width: 1, height: 22 }} />
        <Link href="/admin/clinic" className="adm-btn adm-btn-ghost adm-btn-sm">
          ⚙ Hours & holidays
        </Link>
      </div>
    </Card>
  );

  if (view === "list") return <ListView searchParams={searchParams} link={link} switcher={switcher} settings={settings} />;
  if (view === "route") return <RouteView dateKey={anchor} link={link} switcher={switcher} settings={settings} />;

  /* ---- the calendar grid: a week, or a single day ---- */

  const days = view === "day" ? 1 : 7;
  const startKey = view === "day" ? anchor : weekStart(anchor);
  const keys = rangeOfKeys(startKey, days);
  const { byDay, total } = await getCalendarDays({ startKey, days });

  const prev = addDays(startKey, -days);
  const next = addDays(startKey, days);

  return (
    <>
      <PageHeader eyebrow="Sessions" title="Schedule">
        <Link href={link({ view: "route", date: todayKey() })} className="adm-btn adm-btn-ghost">
          ⌂ Today's home visits
        </Link>
      </PageHeader>

      <div className="adm-body">
        {switcher}

        <Card
          title={
            days === 1
              ? formatDateKey(startKey)
              : `${formatDateKey(startKey)} – ${formatDateKey(addDays(startKey, days - 1))}`
          }
          subtitle={`${total} session${total === 1 ? "" : "s"} in view`}
          action={
            <div className="adm-inline">
              <Link href={link({ date: prev })} className="adm-btn adm-btn-ghost adm-btn-sm">
                ← Previous
              </Link>
              <Link href={link({ date: todayKey() })} className="adm-btn adm-btn-ghost adm-btn-sm">
                Today
              </Link>
              <Link href={link({ date: next })} className="adm-btn adm-btn-ghost adm-btn-sm">
                Next →
              </Link>
            </div>
          }
          tight
        >
          <ScheduleCalendar settings={settings} byDay={byDay} keys={keys} />
        </Card>

        <p className="adm-small adm-muted">
          Shaded bands are outside opening hours. The panel refuses a booking that clashes with
          another for the same therapist, and warns before one outside your hours — both are set
          under <Link href="/admin/clinic">Hours &amp; holidays</Link>.
        </p>
      </div>
    </>
  );
}

/* ------------------------------------------------------------- list view */

/* The original flat list, kept because it is the better tool for "everything
   still outstanding" — a grid can only show you the weeks you page through. */
async function ListView({ searchParams, link, switcher, settings }) {
  const range = RANGES.some((r) => r.key === searchParams?.range) ? searchParams.range : "week";
  const status = searchParams?.status || "";
  const page = Number(searchParams?.page) || 1;

  const { rows, total, pages, page: current } = await listSessions({ range, status, page });

  return (
    <>
      <PageHeader eyebrow="Sessions" title="Schedule" />

      <div className="adm-body">
        {switcher}

        <Card>
          <div className="adm-inline">
            {RANGES.map((r) => (
              <Link
                key={r.key}
                href={link({ view: "list", range: r.key, status, page: 1 })}
                className={`adm-btn adm-btn-sm ${range === r.key ? "adm-btn-primary" : "adm-btn-ghost"}`}
              >
                {r.label}
              </Link>
            ))}
            <span className="adm-sep" style={{ width: 1, height: 22 }} />
            <Link
              href={link({ view: "list", range, status: "", page: 1 })}
              className={`adm-btn adm-btn-sm ${!status ? "adm-btn-primary" : "adm-btn-ghost"}`}
            >
              Any status
            </Link>
            {Object.entries(SESSION_STATUS_LABEL).map(([value, label]) => (
              <Link
                key={value}
                href={link({ view: "list", range, status: value, page: 1 })}
                className={`adm-btn adm-btn-sm ${status === value ? "adm-btn-primary" : "adm-btn-ghost"}`}
              >
                {label}
              </Link>
            ))}
          </div>
        </Card>

        <Card title={`${total} session${total === 1 ? "" : "s"}`} tight>
          {rows.length === 0 ? (
            <Empty icon="◔" title="Nothing here" hint="Try a different range or status." />
          ) : (
            <>
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Patient</th>
                      <th className="shrink">Visit</th>
                      <th>Status</th>
                      <th>Treatment</th>
                      <th className="num">Pain</th>
                      <th className="shrink" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((s) => (
                      <tr key={s._id}>
                        <td className="adm-small">
                          {formatDateTime(s.scheduledAt)}
                          {s.visitType === "home" ? <div className="adm-table-sub">⌂ Home visit</div> : null}
                        </td>
                        <td>
                          {s.patient ? (
                            <Link href={`/admin/patients/${s.patient.slug}`} className="adm-table-name">
                              {s.patient.name}
                            </Link>
                          ) : (
                            <span className="adm-muted">Deleted patient</span>
                          )}
                          <div className="adm-table-sub">{s.patient?.phone}</div>
                        </td>
                        <td className="adm-mono shrink">#{s.number}</td>
                        <td>
                          <SessionBadge status={s.status} />
                        </td>
                        <td className="adm-small adm-muted">{s.treatment || "—"}</td>
                        <td className="num adm-mono">{s.painScore ?? "—"}</td>
                        <td className="shrink">
                          {s.status === "scheduled" && s.patient ? (
                            <WhatsAppButton
                              phone={s.patient.phone}
                              message={sessionReminderText({
                                patientName: s.patient.name,
                                session: s,
                                clinicName: settings.clinicName,
                                therapistName: s.therapist || settings.therapistName,
                              })}
                              label="Remind"
                            />
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pages > 1 ? (
                <div className="adm-pager">
                  <span>
                    Page {current} of {pages}
                  </span>
                  <span className="adm-inline">
                    {current > 1 ? (
                      <Link
                        href={link({ view: "list", range, status, page: current - 1 })}
                        className="adm-btn adm-btn-ghost adm-btn-sm"
                      >
                        ← Previous
                      </Link>
                    ) : null}
                    {current < pages ? (
                      <Link
                        href={link({ view: "list", range, status, page: current + 1 })}
                        className="adm-btn adm-btn-ghost adm-btn-sm"
                      >
                        Next →
                      </Link>
                    ) : null}
                  </span>
                </div>
              ) : null}
            </>
          )}
        </Card>
      </div>
    </>
  );
}

/* ------------------------------------------------------------ route view */

/* The day's home visits, in appointment order — which is the order they have to
   be driven, because that is what each patient was told. */
async function RouteView({ dateKey, link, switcher, settings }) {
  const { rows, travelTotal } = await getHomeVisits(dateKey);

  const stops = rows
    .map((s) => (s.visitAddress || [s.patient?.address, s.patient?.city].filter(Boolean).join(", ")).trim())
    .filter(Boolean);

  // Google Maps takes the whole run in one URL: first stop as destination when
  // there is only one, otherwise everything between as waypoints.
  const mapsUrl = stops.length
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stops[stops.length - 1])}${
        stops.length > 1
          ? `&waypoints=${encodeURIComponent(stops.slice(0, -1).join("|"))}`
          : ""
      }`
    : null;

  return (
    <>
      <PageHeader eyebrow="Sessions" title="Home visits">
        {mapsUrl ? (
          <a href={mapsUrl} target="_blank" rel="noreferrer" className="adm-btn adm-btn-primary">
            Open the whole route in Maps
          </a>
        ) : null}
      </PageHeader>

      <div className="adm-body">
        {switcher}

        <div className="adm-grid cols-3">
          <Stat label="Date" value={formatDateKey(dateKey)} hint="Home visits only" />
          <Stat label="Visits" value={rows.length} hint="In appointment order" />
          <Stat
            label="Travel charged"
            value={formatMoney(travelTotal)}
            hint="Recorded per visit, separate from package fees"
          />
        </div>

        <Card
          title="The run"
          action={
            <div className="adm-inline">
              <Link
                href={link({ view: "route", date: addDays(dateKey, -1) })}
                className="adm-btn adm-btn-ghost adm-btn-sm"
              >
                ← Previous day
              </Link>
              <Link href={link({ view: "route", date: todayKey() })} className="adm-btn adm-btn-ghost adm-btn-sm">
                Today
              </Link>
              <Link
                href={link({ view: "route", date: addDays(dateKey, 1) })}
                className="adm-btn adm-btn-ghost adm-btn-sm"
              >
                Next day →
              </Link>
            </div>
          }
          tight
        >
          {rows.length === 0 ? (
            <Empty
              icon="⌂"
              title="No home visits on this day"
              hint="Set a session's visit type to “Home visit” and it appears here."
            />
          ) : (
            <ol className="adm-route">
              {rows.map((s, i) => {
                const address =
                  s.visitAddress || [s.patient?.address, s.patient?.city].filter(Boolean).join(", ");

                return (
                  <li key={s._id} className="adm-route-stop">
                    <span className="adm-route-num">{i + 1}</span>
                    <div className="adm-route-body">
                      <div className="adm-inline" style={{ justifyContent: "space-between" }}>
                        <strong>
                          {formatTime(s.scheduledAt)} ·{" "}
                          {s.patient ? (
                            <Link href={`/admin/patients/${s.patient.slug}`}>{s.patient.name}</Link>
                          ) : (
                            "Deleted patient"
                          )}
                        </strong>
                        <SessionBadge status={s.status} />
                      </div>
                      <div className="adm-small adm-muted">
                        Visit #{s.number} · {s.durationMin} min
                        {s.travelFee > 0 ? ` · travel ${formatMoney(s.travelFee)}` : ""}
                      </div>
                      <div className="adm-small">{address || <span className="adm-muted">No address recorded</span>}</div>
                      <div className="adm-row-actions" style={{ justifyContent: "flex-start" }}>
                        {address ? (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="adm-btn adm-btn-ghost adm-btn-sm"
                          >
                            Directions
                          </a>
                        ) : null}
                        {s.patient?.phone ? (
                          <a href={`tel:+91${s.patient.phone}`} className="adm-btn adm-btn-ghost adm-btn-sm">
                            Call
                          </a>
                        ) : null}
                        {s.status === "scheduled" && s.patient ? (
                          <WhatsAppButton
                            phone={s.patient.phone}
                            message={sessionReminderText({
                              patientName: s.patient.name,
                              session: s,
                              clinicName: settings.clinicName,
                              therapistName: s.therapist || settings.therapistName,
                            })}
                            label="Remind"
                          />
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      </div>
    </>
  );
}
