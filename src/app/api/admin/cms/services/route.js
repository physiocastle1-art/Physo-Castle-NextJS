import connectDB from "@/lib/db";
import { updateServiceCMS, listServicesCMS } from "@/lib/clinic";
import { jsonOk, readJson, requireApiUser, route, ApiError } from "@/lib/api";

/* Authenticated and per-user: never statically rendered, never cached.
   (The no-store response header is applied to /api/admin/* in next.config.mjs.) */
export const dynamic = "force-dynamic";


export const GET = route(async () => {
  await requireApiUser({ minRole: "staff" });
  await connectDB();
  const services = await listServicesCMS();
  return jsonOk({ services });
});

export const PUT = route(async (req) => {
  await requireApiUser({ minRole: "staff" });
  const body = await readJson(req);

  if (!body.slug || !body.name) {
    throw new ApiError("Slug and Service Name are required.", 400);
  }

  await connectDB();
  const updated = await updateServiceCMS(body.slug, body);
  return jsonOk({ ok: true, service: updated });
});
