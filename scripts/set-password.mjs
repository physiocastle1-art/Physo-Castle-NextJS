/* Sets an admin password directly, for when you're locked out and email isn't
   wired up yet. Runs the same policy the app does: 12+ characters, a letter and
   a number, and rejected if it appears in a known breach.

   The normal path is the invite / reset link — prefer that. Note the password
   lands in your shell history when passed as an argument.

   Usage:
     npm run set:password -- --email you@example.com --password "your new password"
*/
import mongoose from "mongoose";
import { loadEnv } from "./load-env.mjs";

loadEnv();

const { User, AuthSession, AuthToken } = await import("../src/lib/models.js");
const { validateNewPassword, hashPassword } = await import("../src/lib/password.js");

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const email = (arg("--email") || "").trim().toLowerCase();
const password = arg("--password") || "";

if (!email || !password) {
  console.error(`
Usage:
  npm run set:password -- --email you@example.com --password "your new password"
`);
  process.exit(1);
}

const uri = process.env.MONGO_DB_URI;
const dbName = process.env.MONGO_DB_NAME || "physio_castle";

if (!uri) {
  console.error("✗ MONGO_DB_URI is missing from .env.local\n");
  process.exit(1);
}

try {
  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 10000 });

  const user = await User.findOne({ email });
  if (!user) {
    console.error(`\n✗ No account for ${email}. Create one with: npm run seed:admin\n`);
    process.exit(1);
  }

  const problems = await validateNewPassword(password, { email: user.email, name: user.name });
  if (problems.length) {
    console.error("\n✗ That password was rejected:");
    for (const p of problems) console.error(`  · ${p}`);
    console.error("");
    process.exit(1);
  }

  const now = new Date();
  user.passwordHash = await hashPassword(password);
  // Setting the password from the server console also stands in as proof of
  // ownership, so the account is usable immediately.
  user.emailVerifiedAt = user.emailVerifiedAt || now;
  user.passwordChangedAt = now;
  await user.save();

  // Any pending invite/reset link and every existing session are retired.
  await AuthToken.deleteMany({ user: user._id, usedAt: null });
  await AuthSession.deleteMany({ user: user._id });

  console.log(`
✓ Password set for ${user.email} (role: ${user.role})
  Email marked confirmed. Pending invite links and all sessions were revoked.

  Sign in at http://localhost:3000/admin
`);
} catch (err) {
  console.error(`\n✗ ${err.constructor.name}: ${err.message.split("\n")[0]}\n`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
