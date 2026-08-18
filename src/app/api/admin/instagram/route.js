import { createInstagramPost, listInstagramPosts } from "@/lib/clinic";
import { toShortcode } from "@/lib/instagram";
import { ApiError, assertValid, jsonOk, readJson, requireApiUser, route } from "@/lib/api";

export const GET = route(async () => {
  await requireApiUser({ minRole: "staff" });
  return jsonOk({ rows: await listInstagramPosts({ includeInactive: true }) });
});

/* Accepts whatever was pasted — a post link, a reel link, a share link with
   tracking parameters — and stores only the shortcode. */
export const POST = route(async (req) => {
  const me = await requireApiUser({ minRole: "staff" });
  const body = await readJson(req);

  const shortcode = toShortcode(body.url ?? body.shortcode);
  assertValid(
    shortcode
      ? {}
      : {
          url: "Paste the link to an Instagram post or reel, e.g. https://www.instagram.com/p/DbvIsE6jIji/",
        }
  );

  const label = String(body.label || "").trim().slice(0, 160);

  try {
    const post = await createInstagramPost({ shortcode, label }, me.id);
    return jsonOk({ ok: true, post }, 201);
  } catch (err) {
    // The unique index on shortcode is what stops the same post being pinned
    // to the wall twice.
    if (err?.code === 11000) throw new ApiError("That post is already in the feed.", 409);
    throw err;
  }
});
