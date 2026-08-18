import crypto from "node:crypto";
import bcrypt from "bcryptjs";

export const PASSWORD_MIN = 12;
// bcrypt silently ignores bytes past 72, so refuse rather than truncate.
export const PASSWORD_MAX = 72;

const BCRYPT_ROUNDS = 12;

/* Returns an array of human-readable problems. Empty array == acceptable.
   Policy is length-first (per NIST 800-63B) plus a light mixed-character rule,
   rather than a long list of composition rules that pushes people to "P@ssw0rd1". */
export function checkPasswordPolicy(password, { email, name } = {}) {
  const problems = [];
  const pw = typeof password === "string" ? password : "";

  if (pw.length < PASSWORD_MIN) {
    problems.push(`Must be at least ${PASSWORD_MIN} characters (yours is ${pw.length}).`);
  }
  if (Buffer.byteLength(pw, "utf8") > PASSWORD_MAX) {
    problems.push(`Must be ${PASSWORD_MAX} bytes or fewer.`);
  }
  if (pw && !/[a-zA-Z]/.test(pw)) problems.push("Must contain at least one letter.");
  if (pw && !/[0-9]/.test(pw)) problems.push("Must contain at least one number.");
  if (pw && /^(.)\1+$/.test(pw)) problems.push("Cannot be the same character repeated.");

  const lower = pw.toLowerCase();
  const localPart = typeof email === "string" ? email.split("@")[0] : "";
  for (const bad of [localPart, name]) {
    if (bad && bad.length >= 4 && lower.includes(bad.toLowerCase())) {
      problems.push("Cannot contain your name or email address.");
      break;
    }
  }

  return problems;
}

/* Have I Been Pwned "range" API, k-anonymity: only the first 5 hex characters
   of the SHA-1 leave this machine, never the password or the full hash.
   Fails OPEN (allows the password) if HIBP is unreachable, so an outage can't
   lock everyone out of the panel — the miss is logged. */
export async function isPasswordPwned(password) {
  const sha1 = crypto.createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true", "User-Agent": "physio-castle-admin" },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HIBP responded ${res.status}`);

    const body = await res.text();
    for (const line of body.split("\n")) {
      const [hashSuffix, countRaw] = line.trim().split(":");
      if (hashSuffix === suffix) {
        const count = Number(countRaw) || 0;
        // Padded responses use a count of 0 — those are decoys, not real hits.
        if (count > 0) return { pwned: true, count, checked: true };
      }
    }
    return { pwned: false, count: 0, checked: true };
  } catch (err) {
    console.warn("[password] HIBP breach check skipped:", err.message);
    return { pwned: false, count: 0, checked: false };
  }
}

/* Full gate used by every place a password is set. Throws nothing — returns
   a list of problems so callers can render them all at once. */
export async function validateNewPassword(password, context) {
  const problems = checkPasswordPolicy(password, context);
  if (problems.length) return problems;

  const { pwned, count } = await isPasswordPwned(password);
  if (pwned) {
    problems.push(
      `This password has appeared in ${count.toLocaleString("en-IN")} known data breaches. Choose a different one.`
    );
  }
  return problems;
}

export function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}
