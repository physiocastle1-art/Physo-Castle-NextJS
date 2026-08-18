import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import connectDB from "@/lib/db";
import { User } from "@/lib/models";
import { plain } from "@/lib/clinic";
import { STAFF_MANAGEMENT_ENABLED } from "@/lib/features";
import StaffManager from "@/components/admin/StaffManager";
import { Alert, PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Staff & access — Physio Castle Admin" };

export default async function StaffPage() {
  // Turned off for now — see src/lib/features.js.
  if (!STAFF_MANAGEMENT_ENABLED) notFound();

  // Staff-level accounts never see this page; requireUser redirects them home.
  const me = await requireUser({ minRole: "admin" });

  await connectDB();
  const staff = await User.find(
    {},
    { name: 1, email: 1, role: 1, emailVerifiedAt: 1, disabledAt: 1, lastLoginAt: 1, createdAt: 1 }
  )
    .sort({ createdAt: 1 })
    .lean();

  return (
    <>
      <PageHeader eyebrow="Access control" title="Staff & access" />

      <div className="adm-body">
        <Alert
          tone="info"
          message="Roles are enforced on the server for every page and every API call."
          details={[
            "Staff — add and edit patients, sessions and payments.",
            "Admin — everything staff can do, plus deleting records and inviting staff.",
            "Owner — everything, plus changing roles. There must always be one active owner.",
          ]}
        />

        <StaffManager staff={plain(staff)} me={me} />
      </div>
    </>
  );
}
