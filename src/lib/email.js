import { Resend } from "resend";
import nodemailer from "nodemailer";

export async function sendLeadEmail(leadData) {
  const apiKey = process.env.RESEND_API_KEY || process.env.NEXT_PUBLIC_RESEND_API_KEY;
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

  const subject = `🚨 New Lead: ${name} (${type})`;

  const formattedParts = Array.isArray(parts) ? parts.join(", ") : parts || "Not specified";
  const formattedSlots = Array.isArray(slots) ? slots.join(", ") : slots || "Any time";

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
            <div class="value" style="font-size: 20px; color: #2a523b;">${name}</div>
          </div>

          <div style="display: flex; gap: 20px;" class="field">
            <div>
              <div class="label">Age</div>
              <div class="value">${age || "N/A"}</div>
            </div>
            <div>
              <div class="label">Gender</div>
              <div class="value">${gender || "N/A"}</div>
            </div>
            <div>
              <div class="label">Request Type</div>
              <div class="badge">${type}</div>
            </div>
          </div>

          <div class="field">
            <div class="label">Phone / Mobile</div>
            <div class="value">
              <a href="tel:${phone}" style="color: #2a523b; text-decoration: underline;">${phone}</a>
            </div>
          </div>

          ${
            address
              ? `<div class="field">
                  <div class="label">Address (Home Visit)</div>
                  <div class="value">${address}</div>
                </div>`
              : ""
          }

          <div class="field">
            <div class="label">Pain Areas / Complaint</div>
            <div class="value">${formattedParts} ${complaint ? `— ${complaint}` : ""}</div>
          </div>

          ${
            notes
              ? `<div class="field">
                  <div class="label">Additional Notes</div>
                  <div class="value" style="font-style: italic; background: #f8fafc; padding: 12px; border-radius: 8px;">"${notes}"</div>
                </div>`
              : ""
          }

          <div class="field">
            <div class="label">Preferred Timings</div>
            <div class="value">${formattedSlots}</div>
          </div>

          <div class="actions">
            <a href="tel:${phone}" class="btn">📞 Call Patient</a>
            <a href="https://wa.me/${phone.replace(/[^0-9]/g, "")}" class="btn btn-wa">💬 Message on WhatsApp</a>
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
