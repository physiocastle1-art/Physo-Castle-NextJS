"use client";
import { useState } from "react";
import { apiPost } from "@/lib/client";
import { Alert, Field } from "@/components/admin/ui";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");

    const res = await apiPost("/api/admin/auth/forgot-password", { email });
    if (!res.ok) setError(res.error);
    else setSent(res.data.message);

    setBusy(false);
  }

  if (sent) {
    return (
      <Alert
        tone="ok"
        message={sent}
        details={["No SMTP is configured yet, so the link is printed in the terminal running the dev server."]}
      />
    );
  }

  return (
    <form className="adm-auth-form" onSubmit={onSubmit} noValidate>
      <Alert tone="error" message={error} />

      <Field label="Your email">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          autoFocus
          required
        />
      </Field>

      <button type="submit" className="adm-btn adm-btn-primary adm-btn-block" disabled={busy}>
        {busy ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
