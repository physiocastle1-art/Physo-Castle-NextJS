import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import connectDB from "@/lib/db";
import { AuthSession, User, ROLE_RANK } from "@/lib/models";
import { SESSION_COOKIE } from "@/lib/session-cookie";

export { SESSION_COOKIE };
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

const sha256 = (v) => crypto.createHash("sha256").update(v).digest("hex");

/* The cookie is the ONLY place a session lives. httpOnly keeps it out of
   document.cookie and therefore out of reach of any injected script; nothing
   is ever written to localStorage or sessionStorage. */
function cookieOptions(maxAgeSeconds) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function getClientIp() {
  const h = headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") || "unknown";
}

export async function createSession(userId) {
  await connectDB();

  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await AuthSession.create({
    user: userId,
    tokenHash: sha256(token),
    userAgent: (headers().get("user-agent") || "").slice(0, 300),
    ip: getClientIp(),
    expiresAt,
  });

  cookies().set(SESSION_COOKIE, token, cookieOptions(Math.floor(SESSION_TTL_MS / 1000)));
  return expiresAt;
}

/* Resolves the caller from the cookie by re-reading the user row from the
   database on every call. Role, disabled state and email verification are
   therefore always the server's current truth — never a client-supplied claim. */
export async function getSessionUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  await connectDB();

  const session = await AuthSession.findOne({
    tokenHash: sha256(token),
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!session) return null;

  const user = await User.findById(session.user).lean();
  if (!user) return null;
  if (user.disabledAt) return null;

  // A password change (or reset) retires every session issued beforehand.
  if (user.passwordChangedAt && session.createdAt < user.passwordChangedAt) return null;

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: Boolean(user.emailVerifiedAt),
    sessionId: String(session._id),
  };
}

export function hasRole(user, minRole) {
  if (!user) return false;
  return (ROLE_RANK[user.role] || 0) >= (ROLE_RANK[minRole] || 0);
}

/* For server components. Redirects instead of throwing so an expired session
   lands the user on the login screen. */
export async function requireUser({ minRole = "staff", requireVerified = true } = {}) {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (requireVerified && !user.emailVerified) redirect("/admin/verify-email");
  if (!hasRole(user, minRole)) redirect("/admin?denied=1");
  return user;
}

export async function destroyCurrentSession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) {
    await connectDB();
    await AuthSession.deleteOne({ tokenHash: sha256(token) });
  }
  cookies().set(SESSION_COOKIE, "", cookieOptions(0));
}

export async function destroySessionsForUser(userId) {
  await connectDB();
  await AuthSession.deleteMany({ user: userId });
}

/* One-time tokens for invites and password resets. The plaintext only ever
   exists in the emailed link; the database keeps a hash. */
export function createOneTimeToken() {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, tokenHash: sha256(token) };
}

export const hashOneTimeToken = sha256;
