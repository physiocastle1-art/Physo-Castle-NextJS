import connectDB from "@/lib/db";
import { updateReviewStatus, deleteReview } from "@/lib/clinic";
import { jsonOk, readJson, requireApiUser, route } from "@/lib/api";

export const PATCH = route(async (req, { params }) => {
  await requireApiUser({ minRole: "staff" });
  const body = await readJson(req);

  await connectDB();
  const updated = await updateReviewStatus(params.id, body);
  return jsonOk({ ok: true, review: updated });
});

export const DELETE = route(async (req, { params }) => {
  await requireApiUser({ minRole: "admin" });
  await connectDB();
  await deleteReview(params.id);
  return jsonOk({ ok: true });
});
