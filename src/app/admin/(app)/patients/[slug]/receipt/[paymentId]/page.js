import { notFound } from "next/navigation";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import { Payment } from "@/lib/models";
import { getClinicSettings, getPatientOverview, plain } from "@/lib/clinic";
import { formatMoney, formatDate, PAYMENT_METHOD_LABEL } from "@/lib/format";
import { formatPhone } from "@/lib/validation";
import { amountInWords } from "@/lib/receipt";
import PrintButton from "@/components/admin/PrintButton";

export async function generateMetadata({ params }) {
  const data = await getPatientOverview(params.slug);
  return { title: data ? `Receipt — ${data.patient.name} — Physio Castle` : "Receipt" };
}

/* One payment, one receipt — the thing a patient actually asks for, as opposed
   to the full statement at ../invoice.

   The receipt number and the totals are read fresh rather than passed in, so a
   printed receipt always matches the ledger at the moment it was printed. */
export default async function PaymentReceiptPage({ params }) {
  if (!mongoose.isValidObjectId(params.paymentId)) notFound();

  const [data, settings] = await Promise.all([getPatientOverview(params.slug), getClinicSettings()]);
  if (!data) notFound();

  await connectDB();
  const payment = plain(await Payment.findById(params.paymentId).lean());
  if (!payment || String(payment.patient) !== String(data.patient._id)) notFound();

  const { patient, billing } = data;

  // Sum of everything received up to and including this payment, so the
  // "balance after this receipt" is what it was on the day, not today.
  const paidToDate = data.payments
    .filter((p) => new Date(p.paidAt) <= new Date(payment.paidAt))
    .reduce((sum, p) => sum + p.amount, 0);
  const balanceAfter = Math.max(0, billing.feeTotal - paidToDate);

  return (
    <div className="rcpt-page">
      <style>{`
        .rcpt-page { background: #f1f5f9; min-height: 100vh; padding: 32px 16px; }
        .rcpt {
          max-width: 640px; margin: 0 auto; background: #fff; color: #0f172a;
          border: 1px solid #e2e8f0; border-radius: 12px; padding: 36px 40px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        }
        .rcpt-head { display: flex; justify-content: space-between; gap: 20px;
          border-bottom: 2px solid #0f172a; padding-bottom: 18px; margin-bottom: 22px; }
        .rcpt-head h1 { font-size: 20px; font-weight: 800; margin: 0; letter-spacing: -0.3px; }
        .rcpt-head p { font-size: 12px; color: #475569; margin: 3px 0 0; }
        .rcpt-tag { text-align: right; }
        .rcpt-tag h2 { font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase;
          color: #64748b; margin: 0 0 6px; font-weight: 700; }
        .rcpt-no { font-family: ui-monospace, monospace; font-size: 15px; font-weight: 700; }
        .rcpt-date { font-size: 12px; color: #64748b; margin-top: 2px; }

        .rcpt-to { margin-bottom: 22px; }
        .rcpt-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px;
          color: #64748b; margin-bottom: 4px; }
        .rcpt-to strong { font-size: 16px; }
        .rcpt-to span { display: block; font-size: 13px; color: #475569; }

        .rcpt-amount { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
          padding: 18px 20px; margin-bottom: 20px; }
        .rcpt-amount .value { font-size: 30px; font-weight: 800; letter-spacing: -1px; }
        .rcpt-words { font-size: 12px; color: #475569; font-style: italic; margin-top: 4px; }

        .rcpt-table { width: 100%; border-collapse: collapse; margin-bottom: 22px; font-size: 13px; }
        .rcpt-table th { text-align: left; font-size: 10px; text-transform: uppercase;
          letter-spacing: 0.6px; color: #64748b; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
        .rcpt-table td { padding: 9px 0; border-bottom: 1px solid #f1f5f9; }
        .rcpt-table td.num, .rcpt-table th.num { text-align: right;
          font-variant-numeric: tabular-nums; }
        .rcpt-table tr.total td { font-weight: 700; border-bottom: none; padding-top: 12px; }
        .rcpt-due { color: #b4402f; font-weight: 700; }

        .rcpt-foot { border-top: 1px solid #e2e8f0; padding-top: 16px; display: flex;
          justify-content: space-between; align-items: flex-end; gap: 20px; }
        .rcpt-foot p { font-size: 11px; color: #64748b; margin: 0; max-width: 60%; }
        .rcpt-sign { text-align: center; font-size: 11px; color: #64748b; }
        .rcpt-sign-line { width: 150px; border-top: 1px solid #94a3b8; margin-bottom: 5px;
          padding-top: 34px; }

        .rcpt-actions { max-width: 640px; margin: 0 auto 16px; display: flex;
          justify-content: flex-end; gap: 10px; }
        .btn-print { background: #2a523b; color: #fff; border: none; padding: 9px 18px;
          border-radius: 7px; font-weight: 600; font-size: 14px; cursor: pointer; }
        .btn-print:hover { background: #21422f; }

        @media print {
          .rcpt-page { background: #fff; padding: 0; }
          .rcpt-actions { display: none !important; }
          .rcpt { border: none; box-shadow: none; padding: 0; max-width: none; }
        }
      `}</style>

      <div className="rcpt-actions">
        <PrintButton />
      </div>

      <div className="rcpt">
        <div className="rcpt-head">
          <div>
            <h1>{settings.clinicName.toUpperCase()}</h1>
            <p>{settings.therapistName}</p>
            <p>{settings.clinicAddress}</p>
            {settings.clinicPhone ? <p>{settings.clinicPhone}</p> : null}
            {settings.clinicEmail ? <p>{settings.clinicEmail}</p> : null}
          </div>
          <div className="rcpt-tag">
            <h2>Payment receipt</h2>
            <div className="rcpt-no">{payment.receiptNo || "—"}</div>
            <div className="rcpt-date">{formatDate(payment.paidAt)}</div>
          </div>
        </div>

        <div className="rcpt-to">
          <div className="rcpt-label">Received with thanks from</div>
          <strong>{patient.name}</strong>
          <span>{formatPhone(patient.phone)}</span>
          {patient.address ? (
            <span>
              {patient.address}
              {patient.city ? `, ${patient.city}` : ""}
            </span>
          ) : null}
        </div>

        <div className="rcpt-amount">
          <div className="rcpt-label">Amount received</div>
          <div className="value">{formatMoney(payment.amount)}</div>
          <div className="rcpt-words">{amountInWords(payment.amount)}</div>
        </div>

        <table className="rcpt-table">
          <thead>
            <tr>
              <th>Towards</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                {patient.plan?.packageName || "Physiotherapy treatment"}
                {patient.diagnosis ? <div style={{ color: "#64748b", fontSize: 12 }}>{patient.diagnosis}</div> : null}
              </td>
              <td className="num">{formatMoney(payment.amount)}</td>
            </tr>
            <tr>
              <td style={{ color: "#64748b" }}>
                Paid by {PAYMENT_METHOD_LABEL[payment.method] || payment.method}
                {payment.note ? ` · ${payment.note}` : ""}
              </td>
              <td className="num" />
            </tr>

            {billing.feeTotal > 0 ? (
              <>
                <tr>
                  <td style={{ color: "#64748b" }}>Total plan fee</td>
                  <td className="num">{formatMoney(billing.feeTotal)}</td>
                </tr>
                <tr>
                  <td style={{ color: "#64748b" }}>Paid to date</td>
                  <td className="num">{formatMoney(paidToDate)}</td>
                </tr>
                <tr className="total">
                  <td>Balance after this receipt</td>
                  <td className={`num${balanceAfter > 0 ? " rcpt-due" : ""}`}>{formatMoney(balanceAfter)}</td>
                </tr>
              </>
            ) : null}
          </tbody>
        </table>

        <div className="rcpt-foot">
          <p>
            {settings.receiptFooter}
            {payment.receiptNo ? "" : " (This payment predates receipt numbering.)"}
          </p>
          <div className="rcpt-sign">
            <div className="rcpt-sign-line" />
            Authorised signature
          </div>
        </div>
      </div>
    </div>
  );
}
