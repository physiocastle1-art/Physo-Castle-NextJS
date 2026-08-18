import { requireUser } from "@/lib/auth";
import ChangePasswordForm from "@/components/admin/ChangePasswordForm";
import { Card, DataItem, PageHeader } from "@/components/admin/ui";

export const metadata = { title: "My account — Physio Castle Admin" };

const ROLE_LABEL = { owner: "Owner", admin: "Admin", staff: "Staff" };

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <>
      <PageHeader eyebrow="Account" title="My account" />

      <div className="adm-body">
        <Card title="Signed in as">
          <dl className="adm-dl">
            <DataItem label="Name">{user.name}</DataItem>
            <DataItem label="Email">{user.email}</DataItem>
            <DataItem label="Role">{ROLE_LABEL[user.role] || user.role}</DataItem>
            <DataItem label="Email confirmed">{user.emailVerified ? "Yes" : "No"}</DataItem>
          </dl>
        </Card>

        <Card
          title="Change password"
          subtitle="Minimum 12 characters, and it must not appear in any known data breach. Changing it signs you out everywhere else."
        >
          <ChangePasswordForm />
        </Card>
      </div>
    </>
  );
}
