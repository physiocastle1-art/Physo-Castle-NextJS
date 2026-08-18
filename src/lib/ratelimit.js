import "server-only";
import connectDB from "@/lib/db";
import { LoginAttempt } from "@/lib/models";
import { ApiError } from "@/lib/api";

/* Attempt throttling for login / password-reset, backed by MongoDB so the
   counter survives a server restart and is shared across instances.

   Two independent buckets are checked on every login:
     - ip+email  → 5 tries / 15 min, then a 15 min lockout (stops guessing
                   one account's password)
     - ip        → 20 tries / 15 min, then a 15 min lockout (stops spraying
                   many accounts from the same machine) */
export const LIMITS = {
  loginIdentity: { limit: 5, windowMs: 15 * 60 * 1000, lockMs: 15 * 60 * 1000 },
  loginIp: { limit: 20, windowMs: 15 * 60 * 1000, lockMs: 15 * 60 * 1000 },
  reset: { limit: 3, windowMs: 60 * 60 * 1000, lockMs: 60 * 60 * 1000 },
  // Guessing an invite / reset token, which arrives by link and so should
  // almost never fail for a legitimate user.
  token: { limit: 10, windowMs: 60 * 60 * 1000, lockMs: 60 * 60 * 1000 },

  /* Public, unauthenticated endpoints. These count EVERY request, not just
     failed ones, because there is no "success" that should reset the budget —
     a real visitor books once, a spammer books a thousand times.

     Contact is the expensive one: each POST sends an email, so an unbounded
     endpoint burns the Resend quota and floods the clinic's inbox. */
  publicContact: { limit: 5, windowMs: 60 * 60 * 1000 },
  publicReview: { limit: 3, windowMs: 60 * 60 * 1000 },
};

/* Throws 429 when the bucket is locked. Call BEFORE doing the expensive work
   (bcrypt compare, sending mail). The lockout deadline is stored on the row, so
   no limit options are needed to read it back. */
export async function assertNotLocked(key) {
  await connectDB();
  const doc = await LoginAttempt.findOne({ key }).lean();
  if (!doc?.lockedUntil) return;

  const remainingMs = doc.lockedUntil.getTime() - Date.now();
  if (remainingMs <= 0) return;

  const minutes = Math.max(1, Math.ceil(remainingMs / 60000));
  throw new ApiError(
    `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    429
  );
}

export async function recordFailure(key, opts) {
  await connectDB();
  const now = new Date();
  const { limit, windowMs, lockMs } = opts;

  const doc = await LoginAttempt.findOne({ key });

  // Fresh bucket, or the previous window has rolled over.
  if (!doc || now - doc.windowStart > windowMs) {
    const reset = {
      key,
      count: 1,
      windowStart: now,
      lockedUntil: null,
      expiresAt: new Date(now.getTime() + windowMs + lockMs),
    };
    try {
      await LoginAttempt.findOneAndUpdate({ key }, reset, { upsert: true });
    } catch (err) {
      // Two simultaneous failures can both try to insert the same key; the
      // loser retries as a plain update rather than surfacing a 500.
      if (err?.code !== 11000) throw err;
      await LoginAttempt.updateOne({ key }, { $inc: { count: 1 } });
    }
    return { remaining: limit - 1 };
  }

  const count = doc.count + 1;
  const locked = count >= limit;

  await LoginAttempt.updateOne(
    { _id: doc._id },
    {
      count,
      lockedUntil: locked ? new Date(now.getTime() + lockMs) : null,
      expiresAt: new Date(now.getTime() + windowMs + lockMs),
    }
  );

  return { remaining: Math.max(0, limit - count), locked };
}

export async function clearAttempts(key) {
  await connectDB();
  await LoginAttempt.deleteOne({ key });
}

/* ------------------------------------------------------ public endpoints */

/* A fixed-window counter for unauthenticated routes, sharing the same
   TTL-expiring collection as the auth throttles above.

   Different from recordFailure(): that one is called only when an attempt
   FAILS and a success clears the bucket, which is right for a password guess.
   This one is called once per request, before the work happens, and there is
   nothing a caller can do to reset it early.

   No separate lockout window — when the budget is spent the caller simply
   waits for the current window to roll over, and Retry-After says how long. */
export async function enforceRateLimit(key, { limit, windowMs }, message) {
  await connectDB();
  const now = new Date();

  const doc = await LoginAttempt.findOne({ key });

  // Fresh bucket, or the previous window has rolled over.
  if (!doc || now - doc.windowStart > windowMs) {
    const fresh = {
      key,
      count: 1,
      windowStart: now,
      lockedUntil: null,
      expiresAt: new Date(now.getTime() + windowMs),
    };
    try {
      await LoginAttempt.findOneAndUpdate({ key }, fresh, { upsert: true });
    } catch (err) {
      // Two simultaneous first-requests race to insert the same key; the loser
      // just counts itself into the winner's window.
      if (err?.code !== 11000) throw err;
      await LoginAttempt.updateOne({ key }, { $inc: { count: 1 } });
    }
    return;
  }

  const count = doc.count + 1;

  // Counted even when over budget, so hammering the endpoint does not extend
  // the window but does keep the row alive for its full TTL.
  await LoginAttempt.updateOne({ _id: doc._id }, { $inc: { count: 1 } });

  if (count > limit) {
    const retryAfterMs = doc.windowStart.getTime() + windowMs - now.getTime();
    const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000));
    const minutes = Math.max(1, Math.ceil(retryAfterSec / 60));

    throw new ApiError(
      message || `Too many requests. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      429,
      null,
      "rate_limited",
      { "Retry-After": String(retryAfterSec) }
    );
  }
}

/* Rate-limit key for an unauthenticated caller. The IP comes from
   x-forwarded-for, which the CLIENT can forge on a bare origin — behind Vercel
   the platform rewrites it, so this is trustworthy in production and merely
   best-effort locally. Scoped per route so one endpoint cannot exhaust
   another's budget. */
export function publicKey(scope, ip) {
  return `public:${scope}:${ip || "unknown"}`;
}
