import { notFound } from "next/navigation";
import { getClinicSettings, getPatientOverview } from "@/lib/clinic";
import { formatMoney, formatDateTime, formatDate } from "@/lib/format";
import { formatPhone } from "@/lib/validation";
import PrintButton from "@/components/admin/PrintButton";

export async function generateMetadata({ params }) {
  const data = await getPatientOverview(params.slug);
  return { title: data ? `Invoice — ${data.patient.name} — Physio Castle` : "Invoice" };
}

export default async function PatientInvoicePage({ params }) {
  const [data, settings] = await Promise.all([
    getPatientOverview(params.slug),
    getClinicSettings(),
  ]);
  if (!data) notFound();

  const { patient, payments, billing, progress } = data;

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", padding: "40px 20px" }}>
      <style>{`
        .inv-card {
          max-width: 800px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          border: 1px solid #e2e8f0;
          padding: 40px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #0f172a;
        }
        .inv-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 24px;
          margin-bottom: 28px;
        }
        .inv-brand h1 { font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; margin: 0; }
        .inv-brand p { font-size: 13px; color: #475569; margin-top: 4px; }
        .inv-meta { text-align: right; }
        .inv-meta h2 { font-size: 20px; font-weight: 700; color: #2563eb; margin: 0; }
        .inv-meta p { font-size: 12px; color: #64748b; margin-top: 2px; }

        .inv-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          background: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 28px;
          border: 1px solid #f1f5f9;
        }
        .inv-box h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 6px; }
        .inv-box p { font-weight: 600; color: #0f172a; margin: 0; }
        .inv-box span { display: block; font-size: 13px; color: #475569; font-weight: 400; }

        .inv-section-title { font-size: 15px; font-weight: 700; margin-bottom: 12px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }

        .inv-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        .inv-table th { text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
        .inv-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
        .inv-table th.num, .inv-table td.num { text-align: right; }

        .inv-summary {
          margin-left: auto;
          width: 280px;
          background: #f8fafc;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .inv-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #475569; }
        .inv-row.total { font-size: 16px; font-weight: 800; color: #0f172a; border-top: 2px solid #cbd5e1; padding-top: 10px; margin-top: 6px; }
        .inv-row.due { color: #dc2626; font-weight: 700; }

        .inv-footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          text-align: center;
          font-size: 12px;
          color: #64748b;
        }

        .no-print { display: flex; justify-content: flex-end; gap: 12px; max-width: 800px; margin: 0 auto 20px auto; }
        .btn-print { background: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer; }
        .btn-print:hover { background: #1d4ed8; }

        @media print {
          .no-print { display: none !important; }
          .inv-card { border: none !important; box-shadow: none !important; padding: 0 !important; }
        }
      `}</style>

      <div className="no-print">
        <PrintButton />
      </div>

      <div className="inv-card">
        <div className="inv-header">
          <div className="inv-brand">
            <h1>{settings.clinicName.toUpperCase()}</h1>
            <p>{settings.therapistName}</p>
            <p>{settings.clinicAddress}</p>
          </div>
          <div className="inv-meta">
            <h2>ACCOUNT STATEMENT</h2>
            <p>Date: {formatDate(new Date())}</p>
            <p>Patient Ref: {patient.slug.toUpperCase()}</p>
          </div>
        </div>

        <div className="inv-grid">
          <div className="inv-box">
            <h4>Patient Information</h4>
            <p>{patient.name}</p>
            <span>Phone: {formatPhone(patient.phone)}</span>
            {patient.email ? <span>Email: {patient.email}</span> : null}
            {patient.address ? <span>Address: {patient.address}, {patient.city}</span> : null}
          </div>
          <div className="inv-box">
            <h4>Treatment Plan Overview</h4>
            <p>{patient.plan?.packageName || "Standard Consultation & Rehab"}</p>
            <span>Diagnosis: {patient.diagnosis || "Physiotherapy Rehabilitation"}</span>
            <span>Sessions: {progress.completed} completed of {progress.planned || "N/A"} planned</span>
          </div>
        </div>

        <h3 className="inv-section-title">Payment History</h3>
        {payments.length === 0 ? (
          <p style={{ color: "#64748b", padding: "12px 0" }}>No payments recorded yet.</p>
        ) : (
          <table className="inv-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Receipt no.</th>
                <th>Payment Method</th>
                <th>Notes / Reference</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id}>
                  <td>{formatDateTime(p.paidAt)}</td>
                  <td style={{ fontFamily: "ui-monospace, monospace" }}>{p.receiptNo || "—"}</td>
                  <td style={{ textTransform: "capitalize" }}>{p.method.replace("_", " ")}</td>
                  <td style={{ color: "#64748b" }}>{p.note || "—"}</td>
                  <td className="num" style={{ fontWeight: 600 }}>{formatMoney(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="inv-summary">
          <div className="inv-row">
            <span>Total Plan Fee:</span>
            <span>{formatMoney(billing.feeTotal)}</span>
          </div>
          <div className="inv-row">
            <span>Total Paid:</span>
            <span>{formatMoney(billing.paid)}</span>
          </div>
          <div className={`inv-row ${billing.due > 0 ? "due" : "total"}`}>
            <span>Balance Due:</span>
            <span>{formatMoney(billing.due)}</span>
          </div>
        </div>

        <div className="inv-footer">
          <p>{settings.receiptFooter}</p>
          <p style={{ marginTop: 4 }}>Doctor Signature / Stamp</p>
        </div>
      </div>
    </div>
  );
}
