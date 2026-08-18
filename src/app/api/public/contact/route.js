import { sendLeadEmail } from "@/lib/email";
import { getClientIp } from "@/lib/auth";
import { enforceRateLimit, publicKey, LIMITS } from "@/lib/ratelimit";
import { jsonOk, readJson, route, ApiError, NO_STORE, str } from "@/lib/api";

/* Reads the caller's IP, so it can never be prerendered or cached. */
export const dynamic = "force-dynamic";

/* Every field the lead email renders, with the cap it is stored at. Anything
   not listed here is dropped rather than forwarded — the email template is the
   only consumer, and an unbounded body from an unauthenticated form is how you
   end up mailing yourself a megabyte. */
const TEXT_FIELDS = {
  name: 120,
  age: 8,
  gender: 32,
  phone: 24,
  address: 400,
  complaint: 400,
  notes: 2000,
  type: 60,
};
const LIST_FIELDS = { parts: 20, slots: 20 };
const LIST_ITEM_MAX = 80;

const cleanList = (value, maxItems) =>
  (Array.isArray(value) ? value : [])
    .slice(0, maxItems)
    .map((v) => str(v).slice(0, LIST_ITEM_MAX))
    .filter(Boolean);

export const POST = route(async (req) => {
  /* Throttled BEFORE the body is parsed and long before the email is sent.
     Each POST costs an outbound email against the clinic's Resend quota and
     lands in their inbox, so this endpoint is the most abusable thing on the
     site — five per hour per IP is far above what a real visitor needs and far
     below what a spam script wants. */
  await enforceRateLimit(
    publicKey("contact", getClientIp()),
    LIMITS.publicContact,
    "You have sent several requests already. Please call us on +91 95123 46056 if it is urgent."
  );

  const body = await readJson(req);

  const lead = {};
  for (const [field, max] of Object.entries(TEXT_FIELDS)) {
    lead[field] = str(body[field]).slice(0, max);
  }
  for (const [field, maxItems] of Object.entries(LIST_FIELDS)) {
    lead[field] = cleanList(body[field], maxItems);
  }

  if (!lead.name || !lead.phone) {
    throw new ApiError("Name and mobile phone number are required.", 400);
  }

  /* sendLeadEmail() defaults `type` by destructuring, which only fires on
     undefined — and the sanitiser above produces "" for a missing field. */
  if (!lead.type) lead.type = "Appointment Request";

  await sendLeadEmail(lead);

  return jsonOk(
    {
      ok: true,
      message: "Thank you! Your request has been received. We will call you back shortly.",
    },
    201,
    NO_STORE
  );
});
