import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Alert } from "@/components/admin/ui";
import SignOutButton from "@/components/admin/SignOutButton";

export const metadata = { title: "Confirm your email — Physio Castle Admin" };

/* Where requireUser() and requireApiUser() send an account whose email address
   has not been confirmed. Reads, writes and every API mutation stay blocked
   until emailVerifiedAt is set. */
export default async function VerifyEmailPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (user.emailVerified) redirect("/admin");

  return (
    <div className="adm-auth-card">
      <div className="adm-auth-head">
        <span className="adm-brand-mark">PC</span>
        <div>
          <h1>Confirm your email first</h1>
          <p>
            <strong>{user.email}</strong> hasn&apos;t been confirmed yet, so this account
            can&apos;t read or change clinic records.
          </p>
        </div>
      </div>

      <Alert
        tone="warn"
        message="Open the invite link that was emailed to you and set your password there — that step confirms the address."
        details={["If the link has expired, ask the clinic owner to send a new invite from Staff & access."]}
      />

      <div style={{ display: "flex", justifyContent: "center" }}>
        <SignOutButton />
      </div>
    </div>
  );
}
