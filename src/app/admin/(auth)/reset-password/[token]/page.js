import Link from "next/link";
import SetPasswordForm from "@/components/admin/SetPasswordForm";

export const metadata = { title: "Reset your password — Physio Castle Admin" };

export default function ResetPasswordPage({ params }) {
  return (
    <div className="adm-auth-card">
      <div className="adm-auth-head">
        <span className="adm-brand-mark">PC</span>
        <div>
          <h1>Choose a new password</h1>
          <p>Signing in on your other devices will be required again afterwards.</p>
        </div>
      </div>

      <SetPasswordForm
        endpoint="/api/admin/auth/reset-password"
        token={params.token}
        submitLabel="Update password"
      />

      <p className="adm-auth-foot">
        <Link href="/admin/login">Back to sign in</Link>
      </p>
    </div>
  );
}
