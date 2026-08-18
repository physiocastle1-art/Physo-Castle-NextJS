import crypto from "node:crypto";
import connectDB from "@/lib/db";
import { User } from "@/lib/models";
import { verifyPassword, hashPassword } from "@/lib/password";
import { createSession, getClientIp } from "@/lib/auth";
import { assertNotLocked, recordFailure, clearAttempts, LIMITS } from "@/lib/ratelimit";
import { ApiError, jsonOk, readJson, route, str } from "@/lib/api";

/* Compared against when the email doesn't exist, so a missing account takes
   the same time as a wrong password and cannot be detected by timing. */
let dummyHash = null;
async function getDummyHash() {
  if (!dummyHash) dummyHash = await hashPassword(crypto.randomBytes(24).toString("hex"));
  return dummyHash;
}

export const POST = route(async (req) => {
  const body = await readJson(req);
  const email = str(body.email).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) throw new ApiError("Email and password are required.", 400);

  const ip = getClientIp();
  const ipKey = `login:ip:${ip}`;
  const identityKey = `login:id:${ip}|${email}`;

  // Throttle check happens before the bcrypt compare, so a locked-out client
  // costs nothing to reject.
  await assertNotLocked(ipKey);
  await assertNotLocked(identityKey);

  await connectDB();
  const user = await User.findOne({ email });

  const passwordOk = user
    ? await verifyPassword(password, user.passwordHash)
    : await verifyPassword(password, await getDummyHash());

  if (!user || !passwordOk) {
    await Promise.all([
      recordFailure(ipKey, LIMITS.loginIp),
      recordFailure(identityKey, LIMITS.loginIdentity),
    ]);
    // Deliberately identical for "no such account" and "wrong password".
    throw new ApiError("Invalid email or password.", 401);
  }

  if (user.disabledAt) {
    throw new ApiError("This account has been disabled. Ask an owner to re-enable it.", 403);
  }

  await clearAttempts(identityKey);

  await createSession(user._id);
  await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

  // Signing in is allowed while unverified, but every write is blocked until
  // the mailbox is confirmed — so send them to the notice screen.
  return jsonOk({
    ok: true,
    redirect: user.emailVerifiedAt ? "/admin" : "/admin/verify-email",
  });
});
