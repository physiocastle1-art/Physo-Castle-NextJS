import connectDB from "@/lib/db";
import { deleteExpense } from "@/lib/clinic";
import { jsonOk, requireApiUser, route } from "@/lib/api";

export const DELETE = route(async (req, { params }) => {
  await requireApiUser({ minRole: "admin" });
  await connectDB();
  await deleteExpense(params.id);
  return jsonOk({ ok: true });
});
