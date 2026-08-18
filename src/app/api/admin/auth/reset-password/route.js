import connectDB from "@/lib/db";
import { AuthToken, User } from "@/lib/models";
import { validateNewPassword, hashPassword } from "@/lib/password";
import { destroySessionsForUser, getClientIp, hashOneTimeToken } from "@/lib/auth";
import { assertNotLocked, recordFailure, clearAttempts, LIMITS } from "@/lib/ratelimit";
import { ApiError, jsonOk, readJson, route, str } from "@/lib/api";

export const POST = route(async (req) => {
  const body = await readJson(req);
  const token = str(body.token);
  const password = typeof body.password === "string" ? body.password : "";

  if (!token) throw new ApiError("This reset link is incomplete.", 400);

  const ip = getClientIp();
  const ipKey = `token:ip:${ip}`;
  await assertNotLocked(ipKey);

  await connectDB();

  const record = await AuthToken.findOne({
    kind: "reset",
    tokenHash: hashOneTimeToken(token),
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!record) {
    await recordFailure(ipKey, LIMITS.token);
    throw new ApiError("This reset link is invalid or has expired. Request a new one.", 400);
  }

  const user = await User.findById(record.user);
  if (!user) throw new ApiError("That account no longer exists.", 400);
  if (user.disabledAt) throw new ApiError("This account has been disabled.", 403);

  const problems = await validateNewPassword(password, { email: user.email, name: user.name });
  if (problems.length) throw new ApiError("Choose a stronger password.", 400, problems);

  const now = new Date();
  user.passwordHash = await hashPassword(password);
  // Completing a reset by email proves control of the mailbox.
  user.emailVerifiedAt = user.emailVerifiedAt || now;
  user.passwordChangedAt = now;
  await user.save();

  record.usedAt = now;
  await record.save();
  await AuthToken.deleteMany({ user: user._id, usedAt: null });

  // Anyone who was signed in with the old password is signed out, including
  // whoever may have stolen it.
  await destroySessionsForUser(user._id);
  await clearAttempts(ipKey);
  await clearAttempts(`login:id:${ip}|${user.email}`);

  return jsonOk({ ok: true, message: "Password updated. Sign in with your new password." });
});
