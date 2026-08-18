import connectDB from "@/lib/db";
import { Patient, TreatmentSession, Payment } from "@/lib/models";
import { findPatientByRef } from "@/lib/clinic";
import { validatePatient } from "@/lib/validation";
import { prefixKeys } from "@/lib/inputs";
import { ApiError, assertValid, jsonOk, readJson, requireApiUser, route } from "@/lib/api";

/* Authenticated and per-user: never statically rendered, never cached.
   (The no-store response header is applied to /api/admin/* in next.config.mjs.) */
export const dynamic = "force-dynamic";


/* READ — the pages fetch through lib/clinic.js directly, but an explicit GET
   keeps the resource complete for anything scripted against it. */
export const GET = route(async (req, { params }) => {
  await requireApiUser({ minRole: "staff" });

  const patient = await findPatientByRef(params.id);
  if (!patient) throw new ApiError("Patient not found.", 404);

  return jsonOk({ patient: JSON.parse(JSON.stringify(patient)) });
});

/* UPDATE — partial: only the fields actually present in the body are touched. */
export const PATCH = route(async (req, { params }) => {
  await requireApiUser({ minRole: "staff" });

  const body = await readJson(req);
  const { values, plan, errors } = validatePatient(body, { partial: true });
  assertValid(errors);

  const update = { ...values, ...prefixKeys("plan.", plan) };
  if (!Object.keys(update).length) throw new ApiError("Nothing to update.", 400);

  await connectDB();
  const patient = await findPatientByRef(params.id);
  if (!patient) throw new ApiError("Patient not found.", 404);

  // The slug is intentionally NOT regenerated on rename — existing links and
  // bookmarks keep resolving.
  await Patient.updateOne({ _id: patient._id }, { $set: update }, { runValidators: true });

  return jsonOk({ ok: true, slug: patient.slug });
});

/* DELETE — takes the sessions and payments with it; an orphaned ledger row is
   worse than none. Admin and above only. */
export const DELETE = route(async (req, { params }) => {
  await requireApiUser({ minRole: "admin" });

  await connectDB();
  const patient = await findPatientByRef(params.id);
  if (!patient) throw new ApiError("Patient not found.", 404);

  const [sessions, payments] = await Promise.all([
    TreatmentSession.deleteMany({ patient: patient._id }),
    Payment.deleteMany({ patient: patient._id }),
  ]);

  await Patient.deleteOne({ _id: patient._id });

  return jsonOk({
    ok: true,
    deleted: {
      sessions: sessions.deletedCount || 0,
      payments: payments.deletedCount || 0,
    },
  });
});
