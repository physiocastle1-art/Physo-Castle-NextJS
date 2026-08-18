import { revalidateTag, revalidatePath } from "next/cache";
import { deleteInstagramPost, updateInstagramPost } from "@/lib/clinic";
import { TAGS } from "@/lib/public-data";
import { ApiError, jsonOk, readJson, requireApiUser, route } from "@/lib/api";

export const PATCH = route(async (req, { params }) => {
  await requireApiUser({ minRole: "staff" });
  const body = await readJson(req);

  const values = {};
  if (typeof body.active === "boolean") values.active = body.active;
  if (typeof body.label === "string") values.label = body.label.trim().slice(0, 160);
  if (Number.isFinite(Number(body.order))) values.order = Number(body.order);

  if (!Object.keys(values).length) throw new ApiError("Nothing to update.", 400);

  const post = await updateInstagramPost(params.id, values);
  if (!post) throw new ApiError("Post not found.", 404);

  // Hiding or reordering a post changes the homepage wall.
  revalidateTag(TAGS.instagram);
  revalidatePath("/");

  return jsonOk({ ok: true, post });
});

export const DELETE = route(async (req, { params }) => {
  await requireApiUser({ minRole: "admin" });
  if (!(await deleteInstagramPost(params.id))) throw new ApiError("Post not found.", 404);
  revalidateTag(TAGS.instagram);
  revalidatePath("/");
  return jsonOk({ ok: true });
});
