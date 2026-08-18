import { revalidateTag, revalidatePath } from "next/cache";
import connectDB from "@/lib/db";
import { updateReviewStatus, deleteReview } from "@/lib/clinic";
import { TAGS } from "@/lib/public-data";
import { jsonOk, readJson, requireApiUser, route } from "@/lib/api";

export const PATCH = route(async (req, { params }) => {
  await requireApiUser({ minRole: "staff" });
  const body = await readJson(req);

  await connectDB();
  const updated = await updateReviewStatus(params.id, body);

  /* Approving or rejecting a review changes the public list. Drop the cached
     copy now rather than letting the visitor wait out the hourly revalidate:
     the tag clears the query result, the path clears the prerendered page that
     was built from it. */
  revalidateTag(TAGS.reviews);
  revalidatePath("/testimonials");

  return jsonOk({ ok: true, review: updated });
});

export const DELETE = route(async (req, { params }) => {
  await requireApiUser({ minRole: "admin" });
  await connectDB();
  await deleteReview(params.id);
  revalidateTag(TAGS.reviews);
  revalidatePath("/testimonials");
  return jsonOk({ ok: true });
});
