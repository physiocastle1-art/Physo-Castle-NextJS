import connectDB from "@/lib/db";
import { createReview } from "@/lib/clinic";
import { getApprovedReviews } from "@/lib/public-data";
import { getClientIp } from "@/lib/auth";
import { enforceRateLimit, publicKey, LIMITS } from "@/lib/ratelimit";
import { jsonOk, readJson, route, ApiError, NO_STORE, publicCacheHeaders, str, num } from "@/lib/api";

/* The approved-review list is the same for every visitor, so it is read through
   the tagged data cache rather than hitting Mongo per request, and the response
   carries CDN cache headers on top of that. Approving a review in the admin
   calls revalidateTag(), so the change is live immediately — the one-hour
   revalidate is only a backstop.

   This endpoint is now a fallback path: /testimonials renders the same list on
   the server, so a visitor never waits on this request. */
export const GET = route(async () => {
  const reviews = await getApprovedReviews();
  return jsonOk({ reviews }, 200, publicCacheHeaders(300, 3600));
});

export const POST = route(async (req) => {
  /* Unauthenticated write straight into the database — without this, a script
     can fill the moderation queue faster than anyone can empty it. */
  await enforceRateLimit(
    publicKey("review", getClientIp()),
    LIMITS.publicReview,
    "You have already submitted a review recently. Thank you!"
  );

  const body = await readJson(req);

  const name = str(body.name).slice(0, 120);
  const text = str(body.text).slice(0, 1000);
  const role = str(body.role).slice(0, 120) || "Patient";
  // Clamped rather than trusted: the schema would reject 0 or 99 with a 400,
  // but the select only ever sends 1–5 and a stray value is not worth an error.
  const rating = Math.min(5, Math.max(1, Math.round(num(body.rating, 5) ?? 5)));

  if (!name || !text) {
    throw new ApiError("Name and review text are required.", 400);
  }

  await connectDB();
  /* Lands as status:"pending" (see reviewSchema) — nothing a stranger submits
     appears on the site until someone approves it, so no cache is invalidated
     here. */
  const review = await createReview({ name, rating, role, text });

  return jsonOk(
    { ok: true, message: "Thank you! Your review has been submitted for approval.", review },
    201,
    NO_STORE
  );
});
