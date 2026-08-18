import connectDB from "@/lib/db";
import { findPatientByRef, createAssessment, getPatientAssessments } from "@/lib/clinic";
import { ApiError, jsonOk, readJson, requireApiUser, route } from "@/lib/api";

/* Authenticated and per-user: never statically rendered, never cached.
   (The no-store response header is applied to /api/admin/* in next.config.mjs.) */
export const dynamic = "force-dynamic";


export const GET = route(async (req, { params }) => {
  await requireApiUser({ minRole: "staff" });
  await connectDB();
  const patient = await findPatientByRef(params.id);
  if (!patient) throw new ApiError("Patient not found.", 404);

  const assessments = await getPatientAssessments(patient._id);
  return jsonOk({ assessments });
});

export const POST = route(async (req, { params }) => {
  const me = await requireApiUser({ minRole: "staff" });

  const body = await readJson(req);
  await connectDB();
  const patient = await findPatientByRef(params.id);
  if (!patient) throw new ApiError("Patient not found.", 404);

  const doc = await createAssessment(patient._id, body, me.id);
  return jsonOk({ ok: true, assessment: doc }, 201);
});
