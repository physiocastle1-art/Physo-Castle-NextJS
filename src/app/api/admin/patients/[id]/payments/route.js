import connectDB from "@/lib/db";
import { Payment } from "@/lib/models";
import { findPatientByRef, getClinicSettings, nextReceiptNo } from "@/lib/clinic";
import { validatePayment } from "@/lib/validation";
import { ApiError, assertValid, jsonOk, readJson, requireApiUser, route } from "@/lib/api";

export const POST = route(async (req, { params }) => {
  const me = await requireApiUser({ minRole: "staff" });

  const body = await readJson(req);
  const { values, errors } = validatePayment(body);
  assertValid(errors);

  await connectDB();
  const patient = await findPatientByRef(params.id);
  if (!patient) throw new ApiError("Patient not found.", 404);

  // Numbered at the moment it is recorded, in the financial year of the payment
  // date rather than of today — a payment backdated to March belongs in March's
  // receipt book.
  const settings = await getClinicSettings();

  /* The counter is the only issuer, so a collision means the counter has fallen
     behind the numbers already in the collection — a hand-edited row, or a
     restore from a backup taken mid-write. Take the next number and try again
     rather than dropping the payment: money recorded is not worth losing to a
     numbering hiccup, and the message the clinic would otherwise see ("that
     record already exists") tells them nothing they can act on. */
  let payment = null;
  let receiptNo = "";
  let lastErr = null;

  for (let attempt = 0; attempt < 5 && !payment; attempt += 1) {
    receiptNo = await nextReceiptNo(values.paidAt, settings.receiptPrefix);
    try {
      payment = await Payment.create({
        ...values,
        receiptNo,
        patient: patient._id,
        recordedBy: me.id,
      });
    } catch (err) {
      if (err?.code !== 11000) throw err;
      lastErr = err;
    }
  }

  if (!payment) {
    console.error("[payments] receipt numbering could not settle", lastErr);
    throw new ApiError(
      "Could not allocate a receipt number. Run `npm run backfill:receipts` and try again.",
      409
    );
  }

  return jsonOk({ ok: true, id: String(payment._id), receiptNo }, 201);
});
