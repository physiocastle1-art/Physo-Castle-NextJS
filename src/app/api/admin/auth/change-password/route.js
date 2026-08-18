import connectDB from "@/lib/db";
import { User } from "@/lib/models";
import { validateNewPassword, hashPassword, verifyPassword } from "@/lib/password";
import { createSession, destroySessionsForUser } from "@/lib/auth";
import { ApiError, jsonOk, readJson, requireApiUser, route } from "@/lib/api";

export const POST = route(async (req) => {
  // Unverified accounts may still change their own password.
  const me = await requireApiUser({ requireVerified: false });

  const body = await readJson(req);
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  await connectDB();
  const user = await User.findById(me.id);
  if (!user) throw new ApiError("Account not found.", 404);

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new ApiError("Your current password is not correct.", 400);
  }
  if (currentPassword === newPassword) {
    throw new ApiError("The new password must be different from the current one.", 400);
  }

  const problems = await validateNewPassword(newPassword, { email: user.email, name: user.name });
  if (problems.length) throw new ApiError("Choose a stronger password.", 400, problems);

  user.passwordHash = await hashPassword(newPassword);
  user.passwordChangedAt = new Date();
  await user.save();

  // Every other device is signed out; this one gets a fresh session.
  await destroySessionsForUser(user._id);
  await createSession(user._id);

  return jsonOk({ ok: true, message: "Password changed. Other devices have been signed out." });
});
