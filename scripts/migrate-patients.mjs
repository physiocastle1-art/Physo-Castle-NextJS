/* Backfills patients created before slugs and phone normalisation existed.

   Idempotent — safe to run repeatedly. Run it once after pulling this change:
     npm run migrate:patients
*/
import crypto from "node:crypto";
import mongoose from "mongoose";
import { loadEnv } from "./load-env.mjs";

loadEnv();

const { Patient } = await import("../src/lib/models.js");
const { slugifyName } = await import("../src/lib/slug.js");
const { normalizePhone } = await import("../src/lib/validation.js");

const ALPHABET = "23456789bcdfghjkmnpqrstvwxz";
const suffix = (n = 5) => {
  const bytes = crypto.randomBytes(n);
  let out = "";
  for (let i = 0; i < n; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
};

const uri = process.env.MONGO_DB_URI;
const dbName = process.env.MONGO_DB_NAME || "physio_castle";

if (!uri) {
  console.error("✗ MONGO_DB_URI is missing from .env.local\n");
  process.exit(1);
}

try {
  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 10000 });

  // strictQuery would hide documents whose slug field doesn't exist yet, so go
  // through the raw collection for the scan.
  const raw = mongoose.connection.db.collection("patients");

  /* Search moved from a Mongo $text index to scored regex matching (which can
     do partial and mid-word hits that $text cannot). Drop the old index if it's
     still around — Mongo keeps indexes that a schema no longer declares. */
  const STALE_INDEXES = ["name_text_phone_text_email_text"];
  for (const name of STALE_INDEXES) {
    if (await raw.indexExists(name).catch(() => false)) {
      await raw.dropIndex(name);
      console.log(`  dropped superseded index: ${name}`);
    }
  }

  const total = await raw.countDocuments({});

  if (total === 0) {
    console.log("\n✓ No patients on file — nothing else to migrate.\n");
    process.exit(0);
  }

  const taken = new Set(
    (await raw.find({ slug: { $exists: true } }, { projection: { slug: 1 } }).toArray())
      .map((d) => d.slug)
      .filter(Boolean)
  );

  let slugged = 0;
  let phones = 0;
  let phoneProblems = [];

  const cursor = raw.find({});
  for await (const doc of cursor) {
    const update = {};

    if (!doc.slug) {
      let candidate;
      do {
        candidate = `${slugifyName(doc.name)}-${suffix()}`;
      } while (taken.has(candidate));
      taken.add(candidate);
      update.slug = candidate;
      slugged += 1;
    }

    if (doc.phone) {
      const result = normalizePhone(doc.phone);
      if (result.ok && result.value !== doc.phone) {
        update.phone = result.value;
        phones += 1;
      } else if (!result.ok) {
        // Left untouched rather than guessed at — flagged for a human.
        phoneProblems.push(`${doc.name}: "${doc.phone}" — ${result.reason}`);
      }
    }

    if (Object.keys(update).length) {
      await raw.updateOne({ _id: doc._id }, { $set: update });
    }
  }

  // Builds the unique index on slug now that every document has one.
  await Patient.init();

  console.log(`
✓ Migration complete over ${total} patient${total === 1 ? "" : "s"}
  slugs added:      ${slugged}
  phones tidied:    ${phones}`);

  if (phoneProblems.length) {
    console.log(`
⚠ ${phoneProblems.length} phone number(s) could not be normalised and were left as they are.
  Open each patient and correct the number by hand:`);
    for (const line of phoneProblems) console.log(`  · ${line}`);
  }
  console.log("");
} catch (err) {
  console.error(`\n✗ ${err.constructor.name}: ${err.message.split("\n")[0]}\n`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
