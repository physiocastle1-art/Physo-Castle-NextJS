import connectDB from "@/lib/db";
import { Patient } from "@/lib/models";
import { validatePatient } from "@/lib/validation";
import { generatePatientSlug } from "@/lib/slug";
import { assertValid, jsonOk, readJson, requireApiUser, route } from "@/lib/api";

export const POST = route(async (req) => {
  const me = await requireApiUser({ minRole: "staff" });

  const body = await readJson(req);
  const { values, plan, errors } = validatePatient(body);
  assertValid(errors);

  await connectDB();
  const patient = await Patient.create({
    ...values,
    plan,
    slug: await generatePatientSlug(values.name),
    createdBy: me.id,
  });

  return jsonOk({ ok: true, id: String(patient._id), slug: patient.slug }, 201);
});
