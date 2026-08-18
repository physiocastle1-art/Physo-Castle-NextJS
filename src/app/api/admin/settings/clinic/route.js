import { getClinicSettings, saveClinicSettings } from "@/lib/clinic";
import { validateClinicSettings } from "@/lib/validation";
import { assertValid, jsonOk, readJson, requireApiUser, route } from "@/lib/api";

/* Authenticated and per-user: never statically rendered, never cached.
   (The no-store response header is applied to /api/admin/* in next.config.mjs.) */
export const dynamic = "force-dynamic";


export const GET = route(async () => {
  await requireApiUser({ minRole: "staff" });
  return jsonOk({ settings: await getClinicSettings() });
});

/* Opening hours decide which bookings are refused and what the calendar draws,
   so changing them is an admin action rather than a staff one. */
export const PUT = route(async (req) => {
  await requireApiUser({ minRole: "admin" });

  const body = await readJson(req);
  const { values, errors } = validateClinicSettings(body);
  assertValid(errors);

  return jsonOk({ ok: true, settings: await saveClinicSettings(values) });
});
