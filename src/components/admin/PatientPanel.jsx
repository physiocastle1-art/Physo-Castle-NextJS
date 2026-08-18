"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiDelete } from "@/lib/client";
import PatientForm from "@/components/admin/PatientForm";
import { Alert, Card, DataItem } from "@/components/admin/ui";
import { GENDER_LABEL, formatDate, formatMoney } from "@/lib/format";
import { formatPhone } from "@/lib/validation";

export default function PatientPanel({ patient, packages = [], canDelete }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    const typed = window.prompt(
      `This permanently deletes ${patient.name} along with every session and payment on record.\n\nType DELETE to confirm.`
    );
    if (typed !== "DELETE") return;

    setBusy(true);
    setError("");
    const res = await apiDelete(`/api/admin/patients/${patient._id}`);
    if (!res.ok) {
      setError(res.error);
      setBusy(false);
      return;
    }
    router.replace("/admin/patients");
    router.refresh();
  }

  return (
    <Card
      title="Patient details"
      action={
        <div className="adm-inline">
          <button
            type="button"
            className="adm-btn adm-btn-ghost adm-btn-sm"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? "Close editor" : "Edit details"}
          </button>
          {canDelete ? (
            <button
              type="button"
              className="adm-btn adm-btn-danger adm-btn-sm"
              onClick={remove}
              disabled={busy}
            >
              Delete patient
            </button>
          ) : null}
        </div>
      }
    >
      <Alert tone="error" message={error} />

      {editing ? (
        <PatientForm patient={patient} packages={packages} onDone={() => setEditing(false)} />
      ) : (
        <dl className="adm-dl">
          <DataItem label="Mobile">
            <a href={`tel:+91${patient.phone}`}>{formatPhone(patient.phone)}</a>
          </DataItem>
          <DataItem label="Email">
            {patient.email ? <a href={`mailto:${patient.email}`}>{patient.email}</a> : null}
          </DataItem>
          <DataItem label="Age">{patient.age ? `${patient.age} years` : null}</DataItem>
          <DataItem label="Gender">{GENDER_LABEL[patient.gender] || patient.gender}</DataItem>
          <DataItem label="City">{patient.city}</DataItem>
          <DataItem label="Address">{patient.address}</DataItem>
          <DataItem label="Diagnosis">{patient.diagnosis}</DataItem>
          <DataItem label="Referred by">{patient.referredBy}</DataItem>
          <DataItem label="Complaint areas">
            {patient.complaintAreas?.length ? patient.complaintAreas.join(", ") : null}
          </DataItem>
          <DataItem label="Package">{patient.plan?.packageName}</DataItem>
          <DataItem label="Treatment started">
            {patient.plan?.startedAt ? formatDate(patient.plan.startedAt) : null}
          </DataItem>
          <DataItem label="Instalment size">
            {patient.plan?.installmentAmount > 0 ? formatMoney(patient.plan.installmentAmount) : null}
          </DataItem>
          <DataItem label="Added on">{formatDate(patient.createdAt)}</DataItem>
          <div className="adm-dl-item" style={{ gridColumn: "1 / -1" }}>
            <dt>Notes</dt>
            <dd style={{ whiteSpace: "pre-wrap" }}>
              {patient.notes || <span className="adm-muted">—</span>}
            </dd>
          </div>
        </dl>
      )}
    </Card>
  );
}
