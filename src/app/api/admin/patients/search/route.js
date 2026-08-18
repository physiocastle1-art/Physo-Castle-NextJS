import { searchPatients, SEARCH_MIN_LENGTH } from "@/lib/clinic";
import { jsonOk, readJson, requireApiUser, route, str } from "@/lib/api";

/* POST, not GET-with-?q=, on purpose.

   Search terms here are patient names, phone numbers and diagnoses. In a query
   string they end up in browser history, in the Referer header of any
   subsequent request, and in every access log along the way. A POST body keeps
   them out of all three. It also means the URL never has to be re-encoded as
   the user types.

   Not cached, and never prerendered — each call re-checks the session. */
export const POST = route(async (req) => {
  await requireApiUser({ minRole: "staff" });

  const body = await readJson(req);
  const term = str(body.term);

  if (term.length < SEARCH_MIN_LENGTH) {
    return jsonOk({ rows: [], term, truncated: false, tooShort: true });
  }

  const result = await searchPatients(term, { limit: 20 });
  return jsonOk(result);
});
