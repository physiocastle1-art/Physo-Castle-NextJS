/* Verifies the MongoDB connection, credentials and write permission.
   Run: npm run db:check */
import mongoose from "mongoose";
import { loadEnv } from "./load-env.mjs";

loadEnv();

const uri = process.env.MONGO_DB_URI;
const dbName = process.env.MONGO_DB_NAME || "physio_castle";

if (!uri) {
  console.error("✗ MONGO_DB_URI is missing from .env.local");
  process.exit(1);
}

console.log(`\nCluster : ${uri.replace(/\/\/[^@]+@/, "//***:***@")}`);
console.log(`Database: ${dbName}\n`);

try {
  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 10000 });
  await mongoose.connection.db.admin().ping();
  console.log("✓ Connected and authenticated");

  const cols = await mongoose.connection.db.listCollections().toArray();
  console.log(`✓ Collections: ${cols.map((c) => c.name).join(", ") || "(none yet — run npm run seed:admin)"}`);

  const probe = mongoose.connection.db.collection("_write_probe");
  await probe.insertOne({ at: new Date() });
  await probe.drop();
  console.log("✓ Write permission confirmed (readWrite on this database)\n");
} catch (err) {
  console.error(`\n✗ ${err.constructor.name}: ${err.message.split("\n")[0]}\n`);
  if (/bad auth|Authentication failed/i.test(err.message)) {
    console.error("  → Username or password is wrong. If the password contains @ : / ? # or %,");
    console.error("    it must be percent-encoded inside the URI.\n");
  }
  if (/ETIMEDOUT|ServerSelection|querySrv/i.test(err.message)) {
    console.error("  → Usually the Atlas IP allowlist. Atlas → Network Access → Add Current IP Address.\n");
  }
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
