/* Creates the first owner account for the admin panel.

   No password is typed here or stored in your shell history: the script issues
   a one-time invite link, and you choose the password in the browser. That is
   also what marks the email address as confirmed.

   Usage:
     npm run seed:admin -- --name "Dr. Riddhi Shah" --email you@example.com
     npm run seed:admin -- --email you@example.com --reinvite
*/
import crypto from "node:crypto";
import mongoose from "mongoose";
import { loadEnv } from "./load-env.mjs";

loadEnv();

// Imported after loadEnv so the models see a configured environment.
const { User, AuthToken } = await import("../src/lib/models.js");
const { hashPassword } = await import("../src/lib/password.js");

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
const has = (flag) => process.argv.includes(flag);

const email = (arg("--email") || "").trim().toLowerCase();
const name = (arg("--name") || "").trim();
const reinvite = has("--reinvite");

if (!email) {
  console.error(`
Usage:
  npm run seed:admin -- --name "Your Name" --email you@example.com
  npm run seed:admin -- --email you@example.com --reinvite
`);
  process.exit(1);
}
if (!reinvite && !name) {
  console.error("✗ --name is required when creating a new account.\n");
  process.exit(1);
}

const uri = process.env.MONGO_DB_URI;
const dbName = process.env.MONGO_DB_NAME || "physio_castle";
const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

if (!uri) {
  console.error("✗ MONGO_DB_URI is missing from .env.local\n");
  process.exit(1);
}

async function issueInvite(user) {
  await AuthToken.deleteMany({ user: user._id, kind: "invite", usedAt: null });

  const token = crypto.randomBytes(32).toString("base64url");
  await AuthToken.create({
    kind: "invite",
    email: user.email,
    user: user._id,
    tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });

  return `${appUrl}/admin/invite/${token}`;
}

try {
  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 10000 });
  // Builds the unique index on email before we rely on it.
  await User.init();

  let user = await User.findOne({ email });

  if (user && !reinvite) {
    console.log(
      `\n✓ ${email} already exists (role: ${user.role}).\n` +
        `  To send a fresh set-password link, run the same command with --reinvite\n`
    );
    process.exit(0);
  }

  if (!user) {
    const owners = await User.countDocuments({ role: "owner" });
    if (owners > 0) {
      console.log(`\nNote: ${owners} owner account(s) already exist. Adding another.\n`);
    }

    user = await User.create({
      name,
      email,
      role: "owner",
      // Unusable until the invite is accepted — nobody knows this value.
      passwordHash: await hashPassword(crypto.randomBytes(32).toString("hex")),
      emailVerifiedAt: null,
    });
    console.log(`\n✓ Created owner account for ${email}`);
  } else {
    if (name) user.name = name;
    user.disabledAt = null;
    await user.save();
    console.log(`\n✓ Re-issuing an invite for ${email}`);
  }

  const link = await issueInvite(user);

  console.log(`
${"─".repeat(72)}
Open this link in your browser to set your password and sign in.
Valid for 7 days, single use:

  ${link}

${"─".repeat(72)}
Your password must be at least 12 characters and must not appear in any
known data breach (checked against Have I Been Pwned when you submit).
`);
} catch (err) {
  console.error(`\n✗ ${err.constructor.name}: ${err.message.split("\n")[0]}\n`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
