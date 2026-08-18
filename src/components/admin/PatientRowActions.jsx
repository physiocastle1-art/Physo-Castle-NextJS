"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiDelete } from "@/lib/client";
import { formatMoney } from "@/lib/format";

/* Edit / delete straight from the patients list.

   Both actions already existed on the patient's own page, but only there —
   buried under the sessions, payments and assessment panels. Editing a phone
   number meant opening the record, scrolling past everything and finding the
   editor at the bottom. These put the same two operations where the patient is
   actually being looked at.

   Edit is a LINK, not a modal: it opens the record with ?edit=1, so the full
   form renders with every field and the URL is shareable and back-button
   friendly. Delete happens inline, because navigating somewhere in order to
   remove a row is pointless.

   The delete button renders for admins only, but that is a convenience, not
   the control — DELETE /api/admin/patients/[id] independently requires
   minRole "admin" and would reject a staff request that reached it anyway. */
export default function PatientRowActions({ patient, canDelete = false }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const ref = patient.slug || patient._id;

  async function remove() {
    /* Deleting a patient cascades to every session and payment on record, so
       the confirmation states exactly what goes with them and asks for the
       word to be typed. A one-click confirm is too easy to fire by accident on
       a dense table row. */
    const sessions = patient.progress?.total || 0;
    const paid = patient.billing?.paid || 0;

    const detail = [
      sessions ? `${sessions} session${sessions === 1 ? "" : "s"}` : null,
      paid > 0 ? `${formatMoney(paid)} in recorded payments` : null,
    ].filter(Boolean);

    const typed = window.prompt(
      `This permanently deletes ${patient.name}` +
        (detail.length ? `, along with ${detail.join(" and ")}` : "") +
        `.\n\nThis cannot be undone. Type DELETE to confirm.`
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

    // The row is gone from the database; re-render the server component so the
    // table, the total count and the pager all agree with it again.
    router.refresh();
    setBusy(false);
  }

  return (
    <>
      <div className="adm-row-actions">
        <Link
          href={`/admin/patients/${ref}`}
          className="adm-btn adm-btn-ghost adm-btn-sm"
          title="View record & SOAP notes"
        >
          📋 SOAP Notes
        </Link>
        <Link
          href={`/admin/patients/${ref}?edit=1#patient-details`}
          className="adm-btn adm-btn-ghost adm-btn-sm"
          title="Edit this patient's details"
        >
          ✏️ Edit
        </Link>
        <a
          href={`/admin/patients/${ref}/invoice`}
          target="_blank"
          rel="noreferrer"
          className="adm-btn adm-btn-ghost adm-btn-sm"
          title="Print receipt / invoice"
        >
          🖨️ Invoice
        </a>
        {canDelete ? (
          <button
            type="button"
            className="adm-btn adm-btn-danger adm-btn-sm"
            onClick={remove}
            disabled={busy}
            title="Delete this patient and all their records"
          >
            {busy ? "Deleting…" : "🗑 Delete"}
          </button>
        ) : null}
      </div>
      {error ? (
        <div className="adm-small" style={{ color: "var(--adm-red)", marginTop: 6 }}>
          {error}
        </div>
      ) : null}
    </>
  );
}
