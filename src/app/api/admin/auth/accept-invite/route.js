import connectDB from "@/lib/db";
import { AuthToken, User } from "@/lib/models";
import { validateNewPassword, hashPassword } from "@/lib/password";
import {
  createSession,
  destroySessionsForUser,
  getClientIp,
  hashOneTimeToken,
} from "@/lib/auth";
import { assertNotLocked, recordFailure, clearAttempts, LIMITS } from "@/lib/ratelimit";
import { ApiError, jsonOk, readJson, route, str } from "@/lib/api";

/* Accepting an invite sets the first password AND verifies the email address —
   possession of the emailed link is the proof of ownership. */
export const POST = route(async (req) => {
  const body = await readJson(req);
  const token = str(body.token);
  const password = typeof body.password === "string" ? body.password : "";

  if (!token) throw new ApiError("This invite link is incomplete.", 400);

  const ip = getClientIp();
  const ipKey = `token:ip:${ip}`;
  await assertNotLocked(ipKey);

  await connectDB();

  const record = await AuthToken.findOne({
    kind: "invite",
    tokenHash: hashOneTimeToken(token),
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!record) {
    await recordFailure(ipKey, LIMITS.token);
    throw new ApiError("This invite link is invalid or has expired. Ask for a new one.", 400);
  }

  const user = await User.findById(record.user);
  if (!user) throw new ApiError("The invited account no longer exists.", 400);
  if (user.disabledAt) throw new ApiError("This account has been disabled.", 403);

  const problems = await validateNewPassword(password, { email: user.email, name: user.name });
  if (problems.length) throw new ApiError("Choose a stronger password.", 400, problems);

  const now = new Date();
  user.passwordHash = await hashPassword(password);
  user.emailVerifiedAt = user.emailVerifiedAt || now;
  user.passwordChangedAt = now;
  if (str(body.name)) user.name = str(body.name).slice(0, 120);
  await user.save();

  record.usedAt = now;
  await record.save();
  // Retire any other outstanding invites/resets for this account.
  await AuthToken.deleteMany({ user: user._id, usedAt: null });

  await clearAttempts(ipKey);
  await destroySessionsForUser(user._id);
  await createSession(user._id);

  return jsonOk({ ok: true, redirect: "/admin" });
});
