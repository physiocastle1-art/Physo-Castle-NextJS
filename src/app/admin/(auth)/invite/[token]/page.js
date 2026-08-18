import connectDB from "@/lib/db";
import { AuthToken, User } from "@/lib/models";
import { hashOneTimeToken } from "@/lib/auth";
import SetPasswordForm from "@/components/admin/SetPasswordForm";
import { Alert } from "@/components/admin/ui";
import Link from "next/link";

export const metadata = { title: "Accept your invite — Physio Castle Admin" };

/* The token is validated here purely so an expired link shows a clear message
   instead of a form that will fail. The real check happens again in the POST
   handler, which is what actually sets the password. */
async function inviteeFor(token) {
  await connectDB();
  const record = await AuthToken.findOne({
    kind: "invite",
    tokenHash: hashOneTimeToken(token),
    usedAt: null,
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!record) return null;

  const user = await User.findById(record.user, { name: 1, email: 1, role: 1, disabledAt: 1 }).lean();
  if (!user || user.disabledAt) return null;
  return { name: user.name, email: user.email, role: user.role };
}

export default async function AcceptInvitePage({ params }) {
  const invitee = await inviteeFor(params.token);

  if (!invitee) {
    return (
      <div className="adm-auth-card">
        <div className="adm-auth-head">
          <span className="adm-brand-mark">PC</span>
          <h1>This invite is no longer valid</h1>
        </div>
        <Alert
          tone="error"
          message="The link has expired, has already been used, or was replaced by a newer invite. Ask the clinic owner to send you a fresh one."
        />
        <p className="adm-auth-foot">
          <Link href="/admin/login">Back to sign in</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="adm-auth-card">
      <div className="adm-auth-head">
        <span className="adm-brand-mark">PC</span>
        <div>
          <h1>Set your password</h1>
          <p>
            You&apos;ve been invited as <strong>{invitee.role}</strong> for{" "}
            <strong>{invitee.email}</strong>.
          </p>
        </div>
      </div>

      <SetPasswordForm
        endpoint="/api/admin/auth/accept-invite"
        token={params.token}
        submitLabel="Set password & sign in"
        askName
      />

      <p className="adm-auth-foot">
        Setting your password also confirms this email address belongs to you.
      </p>
    </div>
  );
}
