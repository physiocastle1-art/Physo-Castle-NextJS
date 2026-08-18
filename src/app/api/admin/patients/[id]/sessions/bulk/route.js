import connectDB from "@/lib/db";
import { createSessionsBulk, findPatientByRef, getClinicSettings } from "@/lib/clinic";
import { generateOccurrences, BULK_MAX } from "@/lib/recurrence";
import { validateSession } from "@/lib/validation";
import { ApiError, assertValid, jsonOk, readJson, requireApiUser, route } from "@/lib/api";

/* "12 sessions, Mon/Wed/Fri at 5:30pm, starting Monday" in one request.

   The dates are regenerated here from the pattern rather than trusted from the
   browser — the form's preview and this route call the same pure function, so
   they agree, but the server is still the one that decides. */
export const POST = route(async (req, { params }) => {
  const me = await requireApiUser({ minRole: "staff" });
  const body = await readJson(req);

  await connectDB();
  const patient = await findPatientByRef(params.id);
  if (!patient) throw new ApiError("Patient not found.", 404);

  const settings = await getClinicSettings();

  const { occurrences, skipped, errors } = generateOccurrences({
    startDate: body.startDate,
    time: body.time,
    weekdays: body.weekdays,
    count: body.count,
    settings,
    skipHolidays: body.skipHolidays !== false,
  });
  assertValid(errors);

  if (!occurrences.length) throw new ApiError("No dates to book.", 400);
  if (occurrences.length > BULK_MAX) {
    throw new ApiError(`Cannot book more than ${BULK_MAX} sessions at once.`, 400);
  }

  // The per-session fields are validated by the same rules a single booking
  // uses, so a bulk run cannot smuggle past anything the one-at-a-time form
  // would have caught.
  const { values, errors: fieldErrors } = validateSession(
    {
      scheduledAt: occurrences[0].scheduledAt,
      durationMin: body.durationMin,
      therapist: body.therapist,
      treatment: body.treatment,
      visitType: body.visitType,
      visitAddress: body.visitAddress,
      travelFee: body.travelFee,
      status: "scheduled",
    },
    { partial: false }
  );
  assertValid(fieldErrors);

  const { scheduledAt, status, ...base } = values;

  const result = await createSessionsBulk(patient._id, occurrences, { ...base, createdBy: me.id });

  return jsonOk(
    {
      ok: true,
      created: result.created.length,
      // Two different reasons a date didn't become a booking: it fell on a
      // holiday (skipped before we ever tried) or the slot was taken.
      skipped: [...skipped, ...result.skipped],
    },
    201
  );
});
