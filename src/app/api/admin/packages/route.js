import { createPackage, listPackages } from "@/lib/clinic";
import { validatePackage } from "@/lib/validation";
import { assertValid, jsonOk, readJson, requireApiUser, route } from "@/lib/api";

/* Authenticated and per-user: never statically rendered, never cached.
   (The no-store response header is applied to /api/admin/* in next.config.mjs.) */
export const dynamic = "force-dynamic";


export const GET = route(async (req) => {
  await requireApiUser({ minRole: "staff" });
  const { searchParams } = new URL(req.url);
  const includeInactive = searchParams.get("all") === "1";
  return jsonOk({ rows: await listPackages({ includeInactive }) });
});

/* The catalogue is the clinic's price list, so only admins may change it —
   staff select from it when setting up a patient. */
export const POST = route(async (req) => {
  const me = await requireApiUser({ minRole: "admin" });

  const body = await readJson(req);
  const { values, errors } = validatePackage(body);
  assertValid(errors);

  const doc = await createPackage(values, me.id);
  return jsonOk({ ok: true, package: doc }, 201);
});
