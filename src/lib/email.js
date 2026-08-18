import "server-only";
import { Resend } from "resend";
import nodemailer from "nodemailer";

/* Everything below arrives from an UNAUTHENTICATED public form, and is dropped
   straight into an HTML email the clinic opens. Escaped so a submitted
   "<img onerror=...>" or a fake "reply here" link renders as literal text
   rather than as markup in the clinic inbox. */
const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const escList = (v) =>
  (Array.isArray(v) ? v : [v]).filter(Boolean).map(esc).join(", ");

/* CR/LF in a header is how header injection adds a Bcc:. Strip them. */
const escHeader = (v) => String(v ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, 200);

export async function sendLeadEmail(leadData) {
  /* Server-only. NEVER read a NEXT_PUBLIC_* variable for a secret: Next inlines
     every NEXT_PUBLIC_ value into the client bundle, so the key would be
     readable by anyone who opens devtools. */
  const apiKey = process.env.RESEND_API_KEY;
  const clinicEmail = process.env.CLINIC_LEAD_EMAIL || process.env.RESEND_TO_EMAIL || "physiocastle1@gmail.com";
  const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";
  const {
    name,
    age,
    gender,
    phone,
    address,
    complaint,
    parts = [],
    notes,
    slots = [],
    type = "Appointment Request",
  } = leadData;

  const subject = escHeader(`🚨 New Lead: ${name} (${type})`);

  // Digits only — this is what goes into the tel: and wa.me hrefs.
  const phoneDigits = String(phone ?? "").replace(/[^0-9+]/g, "");

  const formattedParts = escList(parts) || "Not specified";
  const formattedSlots = escList(slots) || "Any time";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4eee2; color: #17231c; margin: 0; padding: 20px; }
          .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
          .header { border-bottom: 2px solid #2a523b; padding-bottom: 16px; margin-bottom: 24px; }
          .header h2 { color: #2a523b; margin: 0; font-size: 22px; }
          .header p { color: #64748b; margin: 4px 0 0; font-size: 14px; }
          .field { margin-bottom: 16px; }
          .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #5b6675; font-weight: 600; margin-bottom: 4px; }
          .value { font-size: 16px; color: #17231c; font-weight: 500; }
          .badge { display: inline-block; background: rgba(42, 82, 59, 0.1); color: #2a523b; padding: 6px 14px; border-radius: 100px; font-weight: 600; font-size: 13px; }
          .actions { margin-top: 28px; padding-top: 20px; border-top: 1px solid #f1f5f9; display: flex; gap: 12px; }
          .btn { display: inline-block; padding: 12px 20px; border-radius: 100px; background: #2a523b; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px; }
          .btn-wa { background: #25D366; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h2>🏥 Physio Castle Lead Notification</h2>
            <p>Submitted via Website Contact Form on ${new Date().toLocaleString("en-IN")}</p>
          </div>

          <div class="field">
            <div class="label">Patient Name</div>
            <div class="value" style="font-size: 20px; color: #2a523b;">${esc(name)}</div>
          </div>

          <div style="display: flex; gap: 20px;" class="field">
            <div>
              <div class="label">Age</div>
              <div class="value">${esc(age) || "N/A"}</div>
            </div>
            <div>
              <div class="label">Gender</div>
              <div class="value">${esc(gender) || "N/A"}</div>
            </div>
            <div>
              <div class="label">Request Type</div>
              <div class="badge">${esc(type)}</div>
            </div>
          </div>

          <div class="field">
            <div class="label">Phone / Mobile</div>
            <div class="value">
              <a href="tel:${esc(phoneDigits)}" style="color: #2a523b; text-decoration: underline;">${esc(phone)}</a>
            </div>
          </div>

          ${
            address
              ? `<div class="field">
                  <div class="label">Address (Home Visit)</div>
                  <div class="value">${esc(address)}</div>
                </div>`
              : ""
          }

          <div class="field">
            <div class="label">Pain Areas / Complaint</div>
            <div class="value">${formattedParts} ${complaint ? `— ${esc(complaint)}` : ""}</div>
          </div>

          ${
            notes
              ? `<div class="field">
                  <div class="label">Additional Notes</div>
                  <div class="value" style="font-style: italic; background: #f8fafc; padding: 12px; border-radius: 8px;">&quot;${esc(notes)}&quot;</div>
                </div>`
              : ""
          }

          <div class="field">
            <div class="label">Preferred Timings</div>
            <div class="value">${formattedSlots}</div>
          </div>

          <div class="actions">
            <a href="tel:${esc(phoneDigits)}" class="btn">📞 Call Patient</a>
            <a href="https://wa.me/${esc(phoneDigits.replace(/[^0-9]/g, ""))}" class="btn btn-wa">💬 Message on WhatsApp</a>
          </div>
        </div>
      </body>
    </html>
  `;

  // 1. Try Resend if API Key is configured
  if (apiKey) {
    try {
      const resend = new Resend(apiKey);
      const resendResult = await resend.emails.send({
        from: fromEmail,
        to: [clinicEmail],
        subject,
        html: htmlContent,
      });
      console.log("[Resend] Lead email sent successfully:", resendResult);
      return { success: true, provider: "resend", data: resendResult };
    } catch (err) {
      console.error("[Resend Error] Failed to send email via Resend:", err);
    }
  }

  // 2. Try Nodemailer if SMTP parameters are configured
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const smtpResult = await transporter.sendMail({
        from: fromEmail,
        to: clinicEmail,
        subject,
        html: htmlContent,
      });
      console.log("[Nodemailer SMTP] Lead email sent successfully:", smtpResult);
      return { success: true, provider: "nodemailer", data: smtpResult };
    } catch (err) {
      console.error("[Nodemailer Error] Failed to send email via SMTP:", err);
    }
  }

  // 3. Fallback log if neither API key/SMTP is set yet
  console.log("[Email Service] No RESEND_API_KEY or SMTP credentials configured yet in .env.local. Lead received:", leadData);
  return { success: true, provider: "logger_fallback" };
}
