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
