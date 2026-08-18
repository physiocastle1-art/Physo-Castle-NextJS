/* Changes the address an admin signs in with.

   There is no in-app flow for this: the panel can change a password but not a
   login email, because doing it safely needs to reason about the OTHER accounts
   in the collection, which a settings form has no business doing.

   Like set:password, running this from the server console stands in as proof
   of ownership — you already hold the database credentials — so the new address
   is marked confirmed. Without that the account would land on
   /admin/verify-email and be unable to save anything, and with mail still on
   the console transport there would be no link to escape with.

   Every session and pending invite/reset link is revoked, because the identity
   the sessions were issued against has changed.

   Usage:
     npm run set:email -- --from old@example.com --to new@example.com
     npm run set:email -- --from old@example.com --to new@example.com --replace
*/
import mongoose from "mongoose";
import { loadEnv } from "./load-env.mjs";

loadEnv();

const { User, AuthSession, AuthToken } = await import("../src/lib/models.js");

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
const has = (flag) => process.argv.includes(flag);

const from = (arg("--from") || "").trim().toLowerCase();
const to = (arg("--to") || "").trim().toLowerCase();
const replace = has("--replace");

if (!from || !to) {
  console.error(`
Usage:
  npm run set:email -- --from old@example.com --to new@example.com
  npm run set:email -- --from old@example.com --to new@example.com --replace
`);
  process.exit(1);
}

// Same shape rule the app applies to a patient's address.
if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) {
  console.error(`\n✗ "${to}" is not a valid email address.\n`);
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

  const user = await User.findOne({ email: from });
  if (!user) {
    console.error(`\n✗ No account for ${from}\n`);
    process.exit(1);
  }
  if (from === to) {
    console.log(`\n✓ ${from} already uses that address. Nothing to do.\n`);
    process.exit(0);
  }

  /* The email field is unique, so an occupied address has to be dealt with
     rather than crashed into. An account someone has actually used is never
     removed automatically — that is a decision for a human. */
  const clash = await User.findOne({ email: to });
  if (clash) {
    const inUse = !clash.disabledAt || clash.emailVerifiedAt || clash.lastLoginAt;
    if (inUse) {
      console.error(`
✗ ${to} already belongs to an account that has been used:
    role ${clash.role} · ${clash.name} · verified=${Boolean(clash.emailVerifiedAt)} · disabled=${Boolean(clash.disabledAt)} · last login ${clash.lastLoginAt || "never"}

  Refusing to remove it. Retire that account deliberately first.
`);
      process.exit(1);
    }
    if (!replace) {
      console.error(`
✗ ${to} is taken by a dormant account:
    role ${clash.role} · ${clash.name} · never verified, never signed in, currently disabled

  Re-run with --replace to delete it and free the address.
`);
      process.exit(1);
    }
    await AuthSession.deleteMany({ user: clash._id });
    await AuthToken.deleteMany({ user: clash._id });
    await User.deleteOne({ _id: clash._id });
    console.log(`\n· Removed the dormant account that held ${to} (${clash.role}, ${clash.name})`);
  }

  /* Losing the last way in is the one failure this cannot recover from. */
  if (user.role === "owner") {
    const otherOwners = await User.countDocuments({
      _id: { $ne: user._id },
      role: "owner",
      disabledAt: null,
    });
    if (otherOwners === 0 && user.disabledAt) {
      console.error("\n✗ That is the only owner and it is disabled. Re-enable it first.\n");
      process.exit(1);
    }
  }

  const now = new Date();
  user.email = to;
  user.emailVerifiedAt = now;
  // Not a password change, but it invalidates sessions the same way — the
  // identity they were issued against no longer exists.
  user.passwordChangedAt = now;
  await user.save();

  await AuthToken.deleteMany({ user: user._id, usedAt: null });
  await AuthSession.deleteMany({ user: user._id });

  console.log(`
✓ ${from}
  → ${to}   (role: ${user.role}, name: ${user.name})

  Address marked confirmed. All sessions and pending links revoked —
  everyone signed in as this account has been logged out.

  The password is unchanged. To set one:
    npm run set:password -- --email ${to} --password "..."
`);
} catch (err) {
  if (err?.code === 11000) {
    console.error(`\n✗ ${to} is already taken by another account.\n`);
  } else {
    console.error(`\n✗ ${err.constructor.name}: ${err.message.split("\n")[0]}\n`);
  }
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
