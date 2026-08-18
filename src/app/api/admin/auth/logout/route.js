import { destroyCurrentSession } from "@/lib/auth";
import { jsonOk, route } from "@/lib/api";

export const POST = route(async () => {
  await destroyCurrentSession();
  return jsonOk({ ok: true });
});
