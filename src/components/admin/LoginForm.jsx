"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/client";
import { Alert, Field } from "@/components/admin/ui";

export default function LoginForm({ next = "" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");

    const res = await apiPost("/api/admin/auth/login", { email, password });

    if (!res.ok) {
      setError(res.error);
      setBusy(false);
      return;
    }

    // The session now lives in an httpOnly cookie the browser set for us —
    // there is nothing to save on this side.
    const target = res.data.redirect === "/admin" && next ? next : res.data.redirect;
    router.replace(target || "/admin");
    router.refresh();
  }

  return (
    <form className="adm-auth-form" onSubmit={onSubmit} noValidate>
      <Alert tone="error" message={error} />

      <Field label="Email">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          autoFocus
          required
        />
      </Field>

      <div className="adm-field">
        <label htmlFor="pc-login-pw">Password</label>
        <div className="adm-pw-wrap">
          <input
            id="pc-login-pw"
            type={visible ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
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
      </div>

      <button type="submit" className="adm-btn adm-btn-primary adm-btn-block" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>

      <p className="adm-small adm-muted" style={{ textAlign: "center" }}>
        <Link href="/admin/forgot-password" style={{ color: "var(--adm-green)", fontWeight: 500 }}>
          Forgot your password?
        </Link>
      </p>
    </form>
  );
}
