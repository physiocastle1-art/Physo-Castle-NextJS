import connectDB from "@/lib/db";
import { AuthToken, User } from "@/lib/models";
import { createOneTimeToken, getClientIp, RESET_TTL_MS } from "@/lib/auth";
import { assertNotLocked, recordFailure, LIMITS } from "@/lib/ratelimit";
import { sendMail, appUrl } from "@/lib/mail";
import { jsonOk, readJson, route, str } from "@/lib/api";

export const POST = route(async (req) => {
  const body = await readJson(req);
  const email = str(body.email).toLowerCase();

  const ip = getClientIp();
  const ipKey = `reset:ip:${ip}`;
  const identityKey = `reset:id:${ip}|${email}`;

  await assertNotLocked(ipKey);
  await assertNotLocked(identityKey);

  // Counted whether or not the address exists, so the throttle itself can't be
  // used to discover which addresses are registered.
  await Promise.all([
    recordFailure(ipKey, LIMITS.loginIp),
    recordFailure(identityKey, LIMITS.reset),
  ]);

  if (email) {
    await connectDB();
    const user = await User.findOne({ email });

    if (user && !user.disabledAt) {
      const { token, tokenHash } = createOneTimeToken();
      await AuthToken.create({
        kind: "reset",
        email: user.email,
        user: user._id,
        tokenHash,
        expiresAt: new Date(Date.now() + RESET_TTL_MS),
      });

      const link = appUrl(`/admin/reset-password/${token}`);
      await sendMail({
        to: user.email,
        subject: "Reset your Physio Castle admin password",
        body:
          `Hi ${user.name},\n\n` +
          `Open this link within the next hour to choose a new password:\n\n  ${link}\n\n` +
          `If you didn't ask for this, ignore this email — your password stays as it is.`,
      });
    }
  }

  // Always the same answer, so the response never reveals whether the address
  // has an account.
  return jsonOk({
    ok: true,
    message: "If that email has an account, a reset link is on its way.",
  });
});
