/* Gives a receipt number to every payment recorded before numbering existed.

   Idempotent — payments that already carry a number are left alone, so running
   it twice does nothing the second time.

   Numbering is by financial year and in payment-date order, so the receipt book
   reads chronologically rather than in the order the rows happen to sit in the
   collection. Existing numbers are respected: the counter for a year starts
   above the highest number already issued for it.

     npm run backfill:receipts
*/
import mongoose from "mongoose";
import { loadEnv } from "./load-env.mjs";

loadEnv();

const { Payment, Counter, ClinicSettings } = await import("../src/lib/models.js");
const { financialYearOf, formatReceiptNo } = await import("../src/lib/receipt.js");

const uri = process.env.MONGO_DB_URI;
const dbName = process.env.MONGO_DB_NAME || "physio_castle";

if (!uri) {
  console.error("✗ MONGO_DB_URI is missing from .env.local\n");
  process.exit(1);
}

try {
  await mongoose.connect(uri, { dbName });

  const settings = await ClinicSettings.findOne({ key: "clinic" }).lean();
  const prefix = settings?.receiptPrefix || "PC";

  // Oldest first, so the numbers run forwards through time.
  const pending = await Payment.find({
    $or: [{ receiptNo: { $exists: false } }, { receiptNo: "" }, { receiptNo: null }],
  })
    .sort({ paidAt: 1, _id: 1 })
    .lean();

  if (!pending.length) {
    console.log("\n✓ Every payment already has a receipt number.\n");
  } else {
    // Start each year above whatever has already been handed out for it,
    // whether by a previous run or by the live counter.
    const seqByYear = new Map();

    const seed = async (fy) => {
      if (seqByYear.has(fy)) return seqByYear.get(fy);

      const counter = await Counter.findById(`receipt:${fy}`).lean();
      const highest = await Payment.findOne(
        { receiptNo: new RegExp(`^${prefix}/${fy}/`) },
        { receiptNo: 1 }
      )
        .sort({ receiptNo: -1 })
        .lean();

      const fromReceipts = highest ? Number(highest.receiptNo.split("/").pop()) || 0 : 0;
      const start = Math.max(counter?.seq || 0, fromReceipts);
      seqByYear.set(fy, start);
      return start;
    };

    let done = 0;
    for (const payment of pending) {
      const fy = financialYearOf(payment.paidAt);
      const next = (await seed(fy)) + 1;
      seqByYear.set(fy, next);

      await Payment.updateOne(
        { _id: payment._id },
        { $set: { receiptNo: formatReceiptNo(prefix, fy, next) } }
      );
      done += 1;
    }

    // Leave the live counters above everything just written, so the next
    // payment recorded in the panel cannot collide with a backfilled one.
    for (const [fy, seq] of seqByYear) {
      await Counter.findByIdAndUpdate(`receipt:${fy}`, { $max: { seq } }, { upsert: true });
    }

    console.log(`
✓ ${done} payment${done === 1 ? "" : "s"} numbered across ${seqByYear.size} financial year(s)`);
    for (const [fy, seq] of seqByYear) console.log(`  ${fy}: up to ${formatReceiptNo(prefix, fy, seq)}`);
    console.log("");
  }

  // Builds the partial unique index now that the rows are consistent.
  await Payment.init();
} catch (err) {
  console.error(`\n✗ ${err.constructor.name}: ${err.message.split("\n")[0]}\n`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
