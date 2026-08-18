import connectDB from "@/lib/db";
import { updateAssessment, deleteAssessment } from "@/lib/clinic";
import { jsonOk, readJson, requireApiUser, route } from "@/lib/api";

export const PUT = route(async (req, { params }) => {
  await requireApiUser({ minRole: "staff" });
  const body = await readJson(req);

  const updated = await updateAssessment(params.assessmentId, body);
  return jsonOk({ ok: true, assessment: updated });
});

export const DELETE = route(async (req, { params }) => {
  await requireApiUser({ minRole: "admin" });
  await deleteAssessment(params.assessmentId);
  return jsonOk({ ok: true });
});
