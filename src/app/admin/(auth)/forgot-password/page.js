import Link from "next/link";
import ForgotPasswordForm from "@/components/admin/ForgotPasswordForm";

export const metadata = { title: "Forgot password — Physio Castle Admin" };

export default function ForgotPasswordPage() {
  return (
    <div className="adm-auth-card">
      <div className="adm-auth-head">
        <span className="adm-brand-mark">PC</span>
        <div>
          <h1>Reset your password</h1>
          <p>We&apos;ll send a link that stays valid for one hour.</p>
        </div>
      </div>

      <ForgotPasswordForm />

      <p className="adm-auth-foot">
        <Link href="/admin/login">Back to sign in</Link>
      </p>
    </div>
  );
}
