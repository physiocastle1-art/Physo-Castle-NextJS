import connectDB from "@/lib/db";
import { TreatmentSession } from "@/lib/models";
import { validateSession } from "@/lib/validation";
import { applyCompletedAt } from "@/lib/inputs";
import { assertSlotIsFree } from "@/lib/booking";
import { ApiError, assertValid, jsonOk, readJson, requireApiUser, route } from "@/lib/api";

export const PATCH = route(async (req, { params }) => {
  await requireApiUser({ minRole: "staff" });

  const body = await readJson(req);
  const { values, errors } = validateSession(body, { partial: true });
  assertValid(errors);

  const update = applyCompletedAt(values);
  if (!Object.keys(update).length) throw new ApiError("Nothing to update.", 400);

  await connectDB();
  const existing = await TreatmentSession.findById(params.id).lean();
  if (!existing) throw new ApiError("Session not found.", 404);

  /* The edit is checked against the slot it would end up in, which means
     merging the patch over what is already stored — changing only the duration
     still has to be re-checked against the stored time. Itself excluded, or
     every edit would clash with the row being edited. */
  const merged = { ...existing, ...update };

  if (merged.status === "scheduled") {
    const moved =
      Object.prototype.hasOwnProperty.call(update, "scheduledAt") ||
      Object.prototype.hasOwnProperty.call(update, "durationMin") ||
      Object.prototype.hasOwnProperty.call(update, "therapist") ||
      Object.prototype.hasOwnProperty.call(update, "status");

    if (moved) {
      await assertSlotIsFree({
        scheduledAt: merged.scheduledAt,
        durationMin: merged.durationMin,
        therapist: merged.therapist,
        excludeId: params.id,
        force: Boolean(body.force),
      });
    }
  }

  const session = await TreatmentSession.findByIdAndUpdate(params.id, { $set: update }, {
    new: true,
    runValidators: true,
  });
  if (!session) throw new ApiError("Session not found.", 404);

  return jsonOk({ ok: true });
});

export const DELETE = route(async (req, { params }) => {
  await requireApiUser({ minRole: "admin" });

  await connectDB();
  const session = await TreatmentSession.findByIdAndDelete(params.id);
  if (!session) throw new ApiError("Session not found.", 404);

  return jsonOk({ ok: true });
});
