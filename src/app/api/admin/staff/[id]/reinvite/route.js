import connectDB from "@/lib/db";
import { AuthToken, User } from "@/lib/models";
import { createOneTimeToken, INVITE_TTL_MS } from "@/lib/auth";
import { sendMail, appUrl } from "@/lib/mail";
import { STAFF_MANAGEMENT_ENABLED } from "@/lib/features";
import { ApiError, jsonOk, requireApiUser, route } from "@/lib/api";

/* Re-issue an invite whose link expired or went astray. Only valid while the
   account has never been activated. */
export const POST = route(async (req, { params }) => {
  if (!STAFF_MANAGEMENT_ENABLED) throw new ApiError("Staff management is turned off.", 404);

  const me = await requireApiUser({ minRole: "admin" });

  await connectDB();
  const target = await User.findById(params.id);
  if (!target) throw new ApiError("That account no longer exists.", 404);
  if (target.emailVerifiedAt) {
    throw new ApiError("That account is already active — send a password reset instead.", 400);
  }
  if (target.disabledAt) throw new ApiError("Re-enable the account first.", 400);

  // Old links stop working the moment a new one is issued.
  await AuthToken.deleteMany({ user: target._id, kind: "invite", usedAt: null });

  const { token, tokenHash } = createOneTimeToken();
  await AuthToken.create({
    kind: "invite",
    email: target.email,
    user: target._id,
    tokenHash,
    createdBy: me.id,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });

  const link = appUrl(`/admin/invite/${token}`);
  const mail = await sendMail({
    to: target.email,
    subject: "Your Physio Castle admin invite (new link)",
    body: `Hi ${target.name},\n\nHere is a fresh link to set your password (valid for 7 days):\n\n  ${link}\n`,
  });

  return jsonOk({ ok: true, inviteUrl: mail.delivered ? null : link });
});
