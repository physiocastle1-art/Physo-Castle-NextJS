import mongoose from "mongoose";

const URI = process.env.MONGO_DB_URI;
const DB_NAME = process.env.MONGO_DB_NAME || "physio_castle";

// Cached across hot reloads so dev doesn't open a new pool on every edit.
let cached = global._pcMongoose;
if (!cached) cached = global._pcMongoose = { conn: null, promise: null };

export default async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!URI) {
    throw new Error("MONGO_DB_URI is not set — copy .env.example to .env.local and fill it in.");
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(URI, { dbName: DB_NAME, serverSelectionTimeoutMS: 10000 })
      .catch((err) => {
        // Clear the cached promise so the next request retries instead of
        // permanently resolving to a rejected connection.
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
