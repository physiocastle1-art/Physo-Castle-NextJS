"use client";
import { useId, useState } from "react";

export const PASSWORD_MIN = 12;

/* Mirrors the server policy in src/lib/password.js so the requirements are
   visible while typing. The server re-checks all of it (plus the Have I Been
   Pwned breach lookup, which cannot be done here) — this is guidance, never
   the gate. */
export function passwordRules(value) {
  return [
    { label: `At least ${PASSWORD_MIN} characters`, met: value.length >= PASSWORD_MIN },
    { label: "Contains a letter", met: /[a-zA-Z]/.test(value) },
    { label: "Contains a number", met: /[0-9]/.test(value) },
    { label: "Not a password from a known breach", met: null, hint: true },
  ];
}

function strength(value) {
  if (!value) return 0;
  let score = 0;
  if (value.length >= PASSWORD_MIN) score += 2;
  else if (value.length >= 8) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^a-zA-Z0-9]/.test(value)) score += 1;
  if (value.length >= 18) score += 1;
  return Math.min(4, score);
}

export default function PasswordField({
  label = "Password",
  value,
  onChange,
  autoComplete = "new-password",
  showRules = true,
  required = true,
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const score = strength(value);
  const tone = score <= 1 ? "on-weak" : score === 2 || score === 3 ? "on-ok" : "on-good";

  return (
    <div className="adm-field">
      <label htmlFor={id}>{label}</label>
      <div className="adm-pw-wrap">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required={required}
          style={{ paddingRight: 62 }}
        />
        <button
          type="button"
          className="adm-pw-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>

      {showRules ? (
        <>
          <div className="adm-pw-bars" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`adm-pw-bar${i < score ? ` ${tone}` : ""}`} />
            ))}
          </div>
          <ul className="adm-pw-rules">
            {passwordRules(value).map((rule) => (
              <li key={rule.label} className={rule.met ? "met" : ""}>
                <span>{rule.met ? "✓" : rule.hint ? "·" : "○"}</span>
                <span>
                  {rule.label}
                  {rule.hint ? " (checked when you submit)" : ""}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
