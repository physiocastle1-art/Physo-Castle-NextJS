import Link from "next/link";
import PatientForm from "@/components/admin/PatientForm";
import { listPackages } from "@/lib/clinic";
import { Card, PageHeader } from "@/components/admin/ui";

export const metadata = { title: "New patient — Physio Castle Admin" };

export default async function NewPatientPage() {
  const packages = await listPackages();

  return (
    <>
      <PageHeader eyebrow="Records" title="New patient">
        <Link href="/admin/patients" className="adm-btn adm-btn-ghost">
          Cancel
        </Link>
      </PageHeader>

      <div className="adm-body">
        <Card
          title="Add a patient"
          subtitle="Only name and mobile number are required — everything else can be filled in later."
        >
          <PatientForm packages={packages} />
        </Card>
      </div>
    </>
  );
}
