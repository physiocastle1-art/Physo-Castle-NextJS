import { PATIENT_STATUS_LABEL, SESSION_STATUS_LABEL } from "@/lib/format";

/* Presentational only — no hooks and no server-only imports, so these render
   inside both server and client components. */

export function PageHeader({ eyebrow, title, children }) {
  return (
    <header className="adm-top">
      <div>
        {eyebrow ? <div className="adm-top-eyebrow">{eyebrow}</div> : null}
        <h1>{title}</h1>
      </div>
      {children ? <div className="adm-inline">{children}</div> : null}
    </header>
  );
}

export function Stat({ label, value, hint, tone = "" }) {
  return (
    <div className="adm-stat">
      <div className="adm-stat-label">{label}</div>
      <div className={`adm-stat-value ${tone}`}>{value}</div>
      {hint ? <div className="adm-stat-hint">{hint}</div> : null}
    </div>
  );
}

export function Card({ title, subtitle, action, children, tight = false, id = undefined }) {
  return (
    <section className="adm-card" id={id}>
      {title || action ? (
        <header className="adm-card-head">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      <div className={`adm-card-body${tight ? " tight" : ""}`}>{children}</div>
    </section>
  );
}

export function Badge({ tone = "grey", children }) {
  return <span className={`adm-badge ${tone}`}>{children}</span>;
}

const SESSION_TONE = {
  completed: "green",
  scheduled: "blue",
  cancelled: "grey",
  no_show: "red",
};

export const SessionBadge = ({ status }) => (
  <Badge tone={SESSION_TONE[status] || "grey"}>{SESSION_STATUS_LABEL[status] || status}</Badge>
);

const PATIENT_TONE = {
  active: "green",
  on_hold: "amber",
  completed: "blue",
  inactive: "grey",
};

export const PatientBadge = ({ status }) => (
  <Badge tone={PATIENT_TONE[status] || "grey"}>{PATIENT_STATUS_LABEL[status] || status}</Badge>
);

export function Meter({ percent, amber = false }) {
  const pct = Math.max(0, Math.min(100, Number(percent) || 0));
  return (
    <div className="adm-meter">
      <div className={`adm-meter-fill${amber ? " amber" : ""}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Empty({ icon = "—", title, hint }) {
  return (
    <div className="adm-empty">
      <div className="adm-empty-ico">{icon}</div>
      <p>
        <strong>{title}</strong>
      </p>
      {hint ? <p style={{ marginTop: 4 }}>{hint}</p> : null}
    </div>
  );
}

/* `error` is the message for THIS field, from lib/validation.js — either from
   the browser-side check on submit, or echoed back by the server. */
export function Field({ label, hint, children, span = false, error = null }) {
  return (
    <div className={`adm-field${span ? " span-2" : ""}${error ? " has-error" : ""}`}>
      <label>{label}</label>
      {children}
      {error ? (
        <span className="adm-field-error" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="adm-field-hint">{hint}</span>
      ) : null}
    </div>
  );
}

export function Alert({ tone = "info", message, details }) {
  if (!message && !details?.length) return null;
  return (
    <div className={`adm-alert adm-alert-${tone}`} role={tone === "error" ? "alert" : "status"}>
      {message ? <span>{message}</span> : null}
      {details?.length ? (
        <ul>
          {details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function DataItem({ label, children }) {
  return (
    <div className="adm-dl-item">
      <dt>{label}</dt>
      <dd>{children || <span className="adm-muted">—</span>}</dd>
    </div>
  );
}
