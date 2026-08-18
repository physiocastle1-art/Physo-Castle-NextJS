import "server-only";
import mongoose from "mongoose";

const URI = process.env.MONGO_DB_URI;
const DB_NAME = process.env.MONGO_DB_NAME || "physio_castle";

/* Serverless connection settings.

   On Vercel every cold start is a fresh process opening a fresh connection,
   and an Atlas cluster that has been idle can take a few seconds to answer the
   first handshake. The old 10s server-selection timeout was longer than the
   function's own budget on a Hobby plan, so a slow wake-up surfaced to the
   visitor as a 500 rather than as a slow page — which is exactly what
   "something went wrong" on /admin/login was.

   The fix is a shorter per-attempt timeout with one retry, so a cold start
   costs a couple of seconds instead of failing outright. */
const ATTEMPT_TIMEOUT_MS = 4000;
const RETRIES = 2;
const RETRY_PAUSE_MS = 350;

const OPTIONS = {
  dbName: DB_NAME,
  serverSelectionTimeoutMS: ATTEMPT_TIMEOUT_MS,
  // A serverless invocation handles one request; a large pool is wasted
  // sockets against Atlas's connection limit.
  maxPoolSize: 10,
  minPoolSize: 0,
  // Without this, a query issued while the socket is still coming up is
  // buffered and then fails on a separate, much longer timer — which is how a
  // connection problem ends up reported as an unrelated query timeout.
  bufferCommands: false,
};

// Cached across hot reloads so dev doesn't open a new pool on every edit, and
// across warm invocations so only a cold start pays for a handshake.
let cached = global._pcMongoose;
if (!cached) cached = global._pcMongoose = { conn: null, promise: null };

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connectWithRetry() {
  let lastErr;

  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      return await mongoose.connect(URI, OPTIONS);
    } catch (err) {
      lastErr = err;
      // Only a failure to REACH the cluster is worth retrying. Bad credentials
      // or a malformed URI will fail identically every time, and retrying only
      // delays a clear error.
      const transient =
        err?.name === "MongoServerSelectionError" || err?.name === "MongoNetworkError";
      if (!transient || attempt === RETRIES) break;

      console.warn(`[db] connection attempt ${attempt} failed (${err.name}) — retrying`);
      await pause(RETRY_PAUSE_MS);
    }
  }

  throw lastErr;
}

export default async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!URI) {
    throw new Error("MONGO_DB_URI is not set — copy .env.example to .env.local and fill it in.");
  }

  if (!cached.promise) {
    cached.promise = connectWithRetry().catch((err) => {
      // Clear the cached promise so the next request retries instead of
      // permanently resolving to a rejected connection.
      cached.promise = null;
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    // A readable line in the Vercel log, rather than only the generic
    // "Something went wrong." the API wrapper returns to the browser.
    console.error(`[db] could not reach MongoDB (${err?.name}): ${err?.message?.split("\n")[0]}`);
    throw err;
  }

  return cached.conn;
}
