import connectDB from "@/lib/db";
import { User } from "@/lib/models";
import { destroySessionsForUser } from "@/lib/auth";
import { STAFF_MANAGEMENT_ENABLED } from "@/lib/features";
import { ApiError, jsonOk, readJson, requireApiUser, route, str } from "@/lib/api";

export const PATCH = route(async (req, { params }) => {
  if (!STAFF_MANAGEMENT_ENABLED) throw new ApiError("Staff management is turned off.", 404);

  const me = await requireApiUser({ minRole: "admin" });
  const body = await readJson(req);

  await connectDB();
  const target = await User.findById(params.id);
  if (!target) throw new ApiError("That account no longer exists.", 404);

  const isSelf = String(target._id) === me.id;

  // An admin cannot act on an owner; only an owner outranks an owner.
  if (target.role === "owner" && me.role !== "owner") {
    throw new ApiError("Only the owner can change the owner account.", 403);
  }

  if ("role" in body) {
    const role = str(body.role);
    if (me.role !== "owner") throw new ApiError("Only the owner can change roles.", 403);
    if (isSelf) throw new ApiError("You cannot change your own role.", 400);
    if (!["staff", "admin", "owner"].includes(role)) throw new ApiError("Unknown role.", 400);

    if (target.role === "owner" && role !== "owner") {
      const owners = await User.countDocuments({ role: "owner", disabledAt: null });
      if (owners <= 1) throw new ApiError("There must always be at least one owner.", 400);
    }
    target.role = role;
  }

  if ("disabled" in body) {
    const disabled = Boolean(body.disabled);
    if (isSelf) throw new ApiError("You cannot disable your own account.", 400);

    if (disabled && target.role === "owner") {
      const owners = await User.countDocuments({ role: "owner", disabledAt: null });
      if (owners <= 1) throw new ApiError("There must always be at least one active owner.", 400);
    }

    target.disabledAt = disabled ? new Date() : null;
    // Disabling takes effect immediately — every existing session is dropped.
    if (disabled) await destroySessionsForUser(target._id);
  }

  await target.save();
  return jsonOk({ ok: true });
});
