"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/client";
import PasswordField, { PASSWORD_MIN } from "@/components/admin/PasswordField";
import { Alert, Field } from "@/components/admin/ui";

/* Shared by "accept your invite" and "reset your password" — both end with the
   same job: choose a password the server is willing to accept. */
export default function SetPasswordForm({ endpoint, token, submitLabel, askName = false }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [details, setDetails] = useState(null);
  const [done, setDone] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setDetails(null);

    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    if (password.length < PASSWORD_MIN) {
      setError(`Your password must be at least ${PASSWORD_MIN} characters.`);
      return;
    }

    setBusy(true);
    const res = await apiPost(endpoint, {
      token,
      password,
      ...(askName && name.trim() ? { name: name.trim() } : {}),
    });

    if (!res.ok) {
      setError(res.error);
      setDetails(res.details);
      setBusy(false);
      return;
    }

    if (res.data.redirect) {
      router.replace(res.data.redirect);
      router.refresh();
      return;
    }

    setDone(res.data.message || "Password updated.");
    setBusy(false);
  }

  if (done) {
    return (
      <>
        <Alert tone="ok" message={done} />
        <Link href="/admin/login" className="adm-btn adm-btn-primary adm-btn-block">
          Go to sign in
        </Link>
      </>
    );
  }

  return (
    <form className="adm-auth-form" onSubmit={onSubmit} noValidate>
      <Alert tone="error" message={error} details={details} />

      {askName ? (
        <Field label="Your name" hint="Leave blank to keep the name you were invited with.">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </Field>
      ) : null}

      <PasswordField label="New password" value={password} onChange={setPassword} />

      <Field label="Confirm password">
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
        />
      </Field>

      <button type="submit" className="adm-btn adm-btn-primary adm-btn-block" disabled={busy}>
        {busy ? "Checking password…" : submitLabel}
      </button>
    </form>
  );
}
