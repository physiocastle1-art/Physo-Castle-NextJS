import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, hasRole } from "@/lib/auth";
import { getClinicSettings, getPatientOverview, listPackages } from "@/lib/clinic";
import { formatMoney, formatDateTime } from "@/lib/format";
import { formatPhone } from "@/lib/validation";
import PatientPanel from "@/components/admin/PatientPanel";
import SessionManager from "@/components/admin/SessionManager";
import PaymentManager from "@/components/admin/PaymentManager";
import AssessmentManager from "@/components/admin/AssessmentManager";
import ProgressCharts from "@/components/admin/ProgressCharts";
import { PageHeader, PatientBadge, Stat } from "@/components/admin/ui";

export async function generateMetadata({ params }) {
  const data = await getPatientOverview(params.slug);
  return { title: data ? `${data.patient.name} — Physio Castle Admin` : "Patient not found" };
}

export default async function PatientDetailPage({ params }) {
  const user = await requireUser();

  // Resolves a slug, and still accepts a raw _id so older links keep working.
  const [data, settings, packages] = await Promise.all([
    getPatientOverview(params.slug),
    getClinicSettings(),
    listPackages(),
  ]);
  if (!data) notFound();

  const { patient, sessions, payments, assessments = [], billing, progress } = data;
  // Destructive actions are admin-and-above; staff can create and edit.
  const canDelete = hasRole(user, "admin");

  return (
    <>
      <PageHeader eyebrow="Patient record" title={patient.name}>
        <PatientBadge status={patient.status} />
        <Link href="/admin/patients" className="adm-btn adm-btn-ghost">
          ← All patients
        </Link>
      </PageHeader>

      <div className="adm-body">
        <p className="adm-crumb">
          <Link href="/admin/patients">Patients</Link> / {patient.name} ·{" "}
          <a href={`tel:+91${patient.phone}`}>{formatPhone(patient.phone)}</a>
        </p>

        <div className="adm-grid cols-4">
          <Stat
            label="Sessions completed"
            value={
              progress.planned > 0 ? `${progress.completed} / ${progress.planned}` : progress.completed
            }
            hint={
              progress.planned > 0
                ? `${progress.remaining} remaining · ${progress.scheduled} scheduled`
                : `${progress.scheduled} scheduled`
            }
          />
          <Stat
            label="Next session"
            value={progress.nextSession ? formatDateTime(progress.nextSession) : "—"}
            hint={progress.nextSession ? "Upcoming visit" : "Nothing booked"}
          />
          <Stat
            label="Balance due"
            value={formatMoney(billing.due)}
            tone={billing.due > 0 ? "danger" : "good"}
            hint={`${formatMoney(billing.paid)} paid of ${formatMoney(billing.feeTotal)}`}
          />
          <Stat
            label="Instalments left"
            value={billing.installmentsTotal > 0 ? billing.installmentsLeft : "—"}
            tone={billing.installmentsLeft > 0 ? "danger" : "good"}
            hint={
              billing.installmentsTotal > 0
                ? `${billing.installmentsPaid} of ${billing.installmentsTotal} paid · ${formatMoney(billing.installmentAmount)} each`
                : "No instalment plan set"
            }
          />
        </div>

        <div className="adm-split">
          <SessionManager
            patientId={patient._id}
            patientPhone={patient.phone}
            patientName={patient.name}
            patientAddress={[patient.address, patient.city].filter(Boolean).join(", ")}
            sessions={sessions}
            progress={progress}
            settings={settings}
            canDelete={canDelete}
          />
          <PaymentManager
            patientId={patient._id}
            patientSlug={patient.slug}
            patientPhone={patient.phone}
            patientName={patient.name}
            payments={payments}
            billing={billing}
            settings={settings}
            canDelete={canDelete}
          />
        </div>

        <div style={{ marginTop: "24px" }}>
          <ProgressCharts sessions={sessions} assessments={assessments} />
        </div>

        <div style={{ marginTop: "24px" }}>
          <AssessmentManager
            patientId={patient._id}
            assessments={assessments}
            canDelete={canDelete}
          />
        </div>

        <PatientPanel patient={patient} packages={packages} canDelete={canDelete} />
      </div>
    </>
  );
}
