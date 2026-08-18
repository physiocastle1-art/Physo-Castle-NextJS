import connectDB from "@/lib/db";
import { TreatmentSession } from "@/lib/models";
import { findPatientByRef } from "@/lib/clinic";
import { validateSession } from "@/lib/validation";
import { applyCompletedAt } from "@/lib/inputs";
import { assertSlotIsFree } from "@/lib/booking";
import { ApiError, assertValid, jsonOk, readJson, requireApiUser, route } from "@/lib/api";

export const POST = route(async (req, { params }) => {
  const me = await requireApiUser({ minRole: "staff" });

  const body = await readJson(req);
  const { values, errors } = validateSession(body);
  assertValid(errors);

  await connectDB();
  const patient = await findPatientByRef(params.id);
  if (!patient) throw new ApiError("Patient not found.", 404);

  // Only a live booking can clash — recording a visit that already happened, or
  // one that was cancelled, must never be blocked by the calendar.
  if (values.status === "scheduled") {
    await assertSlotIsFree({
      scheduledAt: values.scheduledAt,
      durationMin: values.durationMin,
      therapist: values.therapist,
      force: Boolean(body.force),
    });
  }

  // Visit numbers continue from the highest ever used, so deleting a session
  // doesn't renumber the patient's history.
  const last = await TreatmentSession.findOne({ patient: patient._id }, { number: 1 })
    .sort({ number: -1 })
    .lean();

  const session = await TreatmentSession.create({
    ...applyCompletedAt(values),
    patient: patient._id,
    number: (last?.number || 0) + 1,
    createdBy: me.id,
  });

  return jsonOk({ ok: true, id: String(session._id) }, 201);
});
