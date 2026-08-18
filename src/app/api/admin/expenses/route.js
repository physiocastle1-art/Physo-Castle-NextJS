import connectDB from "@/lib/db";
import { listExpenses, createExpense, getProfitabilitySummary } from "@/lib/clinic";
import { validateExpense } from "@/lib/validation";
import { assertValid, jsonOk, readJson, requireApiUser, route } from "@/lib/api";

/* Authenticated and per-user: never statically rendered, never cached.
   (The no-store response header is applied to /api/admin/* in next.config.mjs.) */
export const dynamic = "force-dynamic";


export const GET = route(async (req) => {
  await requireApiUser({ minRole: "staff" });
  await connectDB();

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page")) || 1;

  const [data, summary] = await Promise.all([
    listExpenses({ page }),
    getProfitabilitySummary(),
  ]);

  return jsonOk({ ...data, summary });
});

export const POST = route(async (req) => {
  const me = await requireApiUser({ minRole: "staff" });

  const body = await readJson(req);
  const { values, errors } = validateExpense(body);
  assertValid(errors);

  await connectDB();
  const expense = await createExpense(values, me.id);
  return jsonOk({ ok: true, expense }, 201);
});
