import { sendLeadEmail } from "@/lib/email";
import { jsonOk, readJson, route, ApiError } from "@/lib/api";

export const POST = route(async (req) => {
  const body = await readJson(req);

  if (!body.name || !body.phone) {
    throw new ApiError("Name and mobile phone number are required.", 400);
  }

  // Dispatch email notification via Resend / Nodemailer
  await sendLeadEmail(body);

  return jsonOk(
    {
      ok: true,
      message: "Thank you! Your request has been received. We will call you back shortly.",
    },
    201
  );
});
