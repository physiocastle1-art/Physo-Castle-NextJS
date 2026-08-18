import connectDB from "@/lib/db";
import { Payment } from "@/lib/models";
import { validatePayment } from "@/lib/validation";
import { ApiError, assertValid, jsonOk, readJson, requireApiUser, route } from "@/lib/api";

/* UPDATE — correcting a mistyped amount, method or date. Staff can fix an entry
   they just made; only admins can remove one outright. */
export const PATCH = route(async (req, { params }) => {
  await requireApiUser({ minRole: "staff" });

  const body = await readJson(req);
  const { values, errors } = validatePayment(body, { partial: true });
  assertValid(errors);

  if (!Object.keys(values).length) throw new ApiError("Nothing to update.", 400);

  await connectDB();
  const payment = await Payment.findByIdAndUpdate(params.id, { $set: values }, {
    new: true,
    runValidators: true,
  });
  if (!payment) throw new ApiError("Payment not found.", 404);

  return jsonOk({ ok: true });
});

/* DELETE — money leaves the ledger only for admins. */
export const DELETE = route(async (req, { params }) => {
  await requireApiUser({ minRole: "admin" });

  await connectDB();
  const payment = await Payment.findByIdAndDelete(params.id);
  if (!payment) throw new ApiError("Payment not found.", 404);

  return jsonOk({ ok: true });
});
