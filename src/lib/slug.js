import crypto from "node:crypto";
// Relative imports so scripts/ can load this with plain Node.
import connectDB from "./db.js";
import { Patient } from "./models.js";

/* "Meera Patel (Sr.)" → "meera-patel". Diacritics are folded so "Anaïs" and
   "Anais" produce the same readable stem. */
export function slugifyName(name) {
  const base = String(name || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/, "");

  return base || "patient";
}

// Crockford-ish: no vowels, so a random suffix can't spell anything unfortunate.
const ALPHABET = "23456789bcdfghjkmnpqrstvwxz";

const randomSuffix = (length = 5) => {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
};

/* Two patients genuinely can share a name, so the slug always carries a random
   suffix rather than a "-2" counter — no guessing the next patient's URL, and no
   read-then-write race. The unique index is still the final arbiter: we retry a
   few times in the vanishingly unlikely event of a collision. */
export async function generatePatientSlug(name) {
  await connectDB();
  const stem = slugifyName(name);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `${stem}-${randomSuffix()}`;
    if (!(await Patient.exists({ slug: candidate }))) return candidate;
  }

  // Fall back to something that cannot realistically collide.
  return `${stem}-${crypto.randomBytes(8).toString("hex")}`;
}
