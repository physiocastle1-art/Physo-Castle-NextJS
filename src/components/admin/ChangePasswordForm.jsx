"use client";
import { useState } from "react";
import { apiPost } from "@/lib/client";
import PasswordField, { PASSWORD_MIN } from "@/components/admin/PasswordField";
import { Alert, Field } from "@/components/admin/ui";

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [details, setDetails] = useState(null);
  const [done, setDone] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setDetails(null);
    setDone("");

    if (newPassword !== confirm) {
      setError("The two new passwords do not match.");
      return;
    }
    if (newPassword.length < PASSWORD_MIN) {
      setError(`Your new password must be at least ${PASSWORD_MIN} characters.`);
      return;
    }

    setBusy(true);
    const res = await apiPost("/api/admin/auth/change-password", { currentPassword, newPassword });
    setBusy(false);

    if (!res.ok) {
      setError(res.error);
      setDetails(res.details);
      return;
    }

    setDone(res.data.message);
    setCurrentPassword("");
    setNewPassword("");
    setConfirm("");
  }

  return (
    <form className="adm-stack" onSubmit={onSubmit} noValidate>
      <Alert tone="error" message={error} details={details} />
      <Alert tone="ok" message={done} />

      <div style={{ maxWidth: 420, display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Current password">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>

        <PasswordField label="New password" value={newPassword} onChange={setNewPassword} />

        <Field label="Confirm new password">
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>

        <div className="adm-form-actions">
          <button type="submit" className="adm-btn adm-btn-primary" disabled={busy}>
            {busy ? "Checking password…" : "Change password"}
          </button>
        </div>
      </div>
    </form>
  );
}
