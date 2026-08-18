import connectDB from "@/lib/db";
import { AuthToken, User } from "@/lib/models";
import { createOneTimeToken, INVITE_TTL_MS } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { sendMail, appUrl } from "@/lib/mail";
import { STAFF_MANAGEMENT_ENABLED } from "@/lib/features";
import { ApiError, jsonOk, readJson, requireApiUser, route, str, require_ } from "@/lib/api";
import crypto from "node:crypto";

/* Invite a colleague. There is no public signup route anywhere in the app, so
   this is the only way an account comes into existence besides the seed
   script — which is what makes impersonation-by-signup impossible. */
export const POST = route(async (req) => {
  if (!STAFF_MANAGEMENT_ENABLED) throw new ApiError("Staff management is turned off.", 404);

  const me = await requireApiUser({ minRole: "admin" });

  const body = await readJson(req);
  const name = require_(body.name, "Name");
  const email = require_(body.email, "Email").toLowerCase();
  const role = str(body.role) || "staff";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new ApiError("That doesn't look like a valid email address.", 400);
  }
  if (!["staff", "admin"].includes(role)) {
    throw new ApiError("You can invite a staff member or an admin.", 400);
  }
  if (role === "admin" && me.role !== "owner") {
    throw new ApiError("Only the owner can invite another admin.", 403);
  }

  await connectDB();
  if (await User.exists({ email })) {
    throw new ApiError("Someone with that email already has an account.", 409);
  }

  // The account exists but is unusable until the invite is accepted: the hash
  // is of a random string nobody knows, and emailVerifiedAt is null.
  const user = await User.create({
    name,
    email,
    role,
    passwordHash: await hashPassword(crypto.randomBytes(32).toString("hex")),
    emailVerifiedAt: null,
  });

  const { token, tokenHash } = createOneTimeToken();
  await AuthToken.create({
    kind: "invite",
    email,
    user: user._id,
    tokenHash,
    createdBy: me.id,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });

  const link = appUrl(`/admin/invite/${token}`);
  const mail = await sendMail({
    to: email,
    subject: "You've been invited to the Physio Castle admin panel",
    body:
      `Hi ${name},\n\n` +
      `${me.name} has invited you to the Physio Castle admin panel as ${role}.\n\n` +
      `Set your password using this link (valid for 7 days):\n\n  ${link}\n\n` +
      `You'll be asked for a password of at least 12 characters that has not appeared in a known data breach.`,
  });

  // While mail is console-only there is no other way to hand over the link, so
  // it comes back to the inviter. Once real SMTP is wired up this stops.
  return jsonOk({ ok: true, id: String(user._id), inviteUrl: mail.delivered ? null : link }, 201);
});
