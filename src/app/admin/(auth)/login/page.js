import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import LoginForm from "@/components/admin/LoginForm";

export const metadata = { title: "Sign in — Physio Castle Admin" };

export default async function LoginPage({ searchParams }) {
  // Checked here rather than in middleware, which cannot distinguish a valid
  // session cookie from an expired one.
  const user = await getSessionUser();
  if (user) redirect(user.emailVerified ? "/admin" : "/admin/verify-email");

  // Only same-site paths are honoured, so ?next= can't bounce anyone off-site.
  const raw = typeof searchParams?.next === "string" ? searchParams.next : "";
  const next = raw.startsWith("/admin") && !raw.startsWith("//") ? raw : "";

  return (
    <div className="adm-auth-card">
      <div className="adm-auth-head">
        <span className="adm-brand-mark">PC</span>
        <div>
          <h1>Physio Castle Admin</h1>
          <p>Sign in to manage patients, sessions and payments.</p>
        </div>
      </div>

      <LoginForm next={next} />

      <p className="adm-auth-foot">
        Accounts are created by invitation only. Ask the clinic owner to invite you.
      </p>
    </div>
  );
}
