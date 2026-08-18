import { deletePackage, updatePackage } from "@/lib/clinic";
import { validatePackage } from "@/lib/validation";
import { ApiError, assertValid, jsonOk, readJson, requireApiUser, route } from "@/lib/api";

export const PATCH = route(async (req, { params }) => {
  await requireApiUser({ minRole: "admin" });

  const body = await readJson(req);
  const { values, errors } = validatePackage(body, { partial: true });
  assertValid(errors);

  if (!Object.keys(values).length) throw new ApiError("Nothing to update.", 400);

  const doc = await updatePackage(params.id, values);
  if (!doc) throw new ApiError("Package not found.", 404);

  return jsonOk({ ok: true, package: doc });
});

/* Patients keep their own copy of the numbers, so removing a package from the
   catalogue never rewrites a fee that was already agreed. Deactivating is
   usually the better move — it keeps the row for reporting. */
export const DELETE = route(async (req, { params }) => {
  await requireApiUser({ minRole: "admin" });

  const removed = await deletePackage(params.id);
  if (!removed) throw new ApiError("Package not found.", 404);

  return jsonOk({ ok: true });
});
