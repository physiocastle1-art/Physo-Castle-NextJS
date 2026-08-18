import connectDB from "@/lib/db";
import { createReview, listApprovedReviews } from "@/lib/clinic";
import { jsonOk, readJson, route, ApiError } from "@/lib/api";

export const GET = route(async () => {
  await connectDB();
  const reviews = await listApprovedReviews();
  return jsonOk({ reviews });
});

export const POST = route(async (req) => {
  const body = await readJson(req);
  if (!body.name || !body.text) {
    throw new ApiError("Name and review text are required.", 400);
  }

  await connectDB();
  const review = await createReview({
    name: body.name,
    rating: Number(body.rating) || 5,
    role: body.role || "Patient",
    text: body.text,
  });

  return jsonOk({ ok: true, message: "Thank you! Your review has been submitted for approval.", review }, 201);
});
