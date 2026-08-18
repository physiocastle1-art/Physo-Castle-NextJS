import { requireUser, hasRole } from "@/lib/auth";
import { getClinicSettings, listPackages } from "@/lib/clinic";
import { PageHeader, Alert } from "@/components/admin/ui";
import ClinicHoursForm from "@/components/admin/ClinicHoursForm";
import PackageManager from "@/components/admin/PackageManager";

export const metadata = { title: "Clinic setup — Physio Castle Admin" };

/* Everything that is true of the clinic rather than of a patient: when it is
   open, when it is shut, what it sells, and what prints on a receipt. */
export default async function ClinicSetupPage() {
  const user = await requireUser();
  const canManage = hasRole(user, "admin");

  const [settings, packages] = await Promise.all([
    getClinicSettings(),
    listPackages({ includeInactive: true }),
  ]);

  return (
    <>
      <PageHeader eyebrow="Setup" title="Clinic setup" />

      <div className="adm-body">
        {canManage ? null : (
          <Alert
            tone="info"
            message="Only an admin can change opening hours, holidays or the price list. You can see them here."
          />
        )}

        <PackageManager rows={packages} canManage={canManage} />

        {canManage ? (
          <ClinicHoursForm settings={settings} />
        ) : (
          <Alert
            tone="info"
            message={`Opening hours are ${settings.workingHours.filter((d) => !d.closed).length} days a week, ${settings.slotMinutes}-minute slots, with ${settings.holidays.length} holiday(s) set.`}
          />
        )}
      </div>
    </>
  );
}
