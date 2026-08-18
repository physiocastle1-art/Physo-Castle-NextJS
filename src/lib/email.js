import "server-only";
import { sendMail } from "@/lib/mail";

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
  /* Where the lead lands. The provider itself (Resend, then SMTP, then a
     console fallback) is configured once in lib/mail.js — including the rule
     that a secret is NEVER read from a NEXT_PUBLIC_* variable, since Next
     inlines those into the client bundle. */
  const clinicEmail =
    process.env.CLINIC_LEAD_EMAIL || process.env.RESEND_TO_EMAIL || "physiocastle1@gmail.com";
  const lead = leadData || {};
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

  /* A plain-text alternative, so the lead is still readable in a client that
     refuses HTML and so spam filters see a multipart message rather than a
     lone HTML blob. */
  const textContent = [
    `New ${lead.type} from the website`,
    "",
    `Name:     ${lead.name}`,
    `Phone:    ${lead.phone}`,
    lead.age ? `Age:      ${lead.age}` : null,
    lead.gender ? `Gender:   ${lead.gender}` : null,
    lead.address ? `Address:  ${lead.address}` : null,
    `Areas:    ${formattedParts}`,
    lead.complaint ? `Complaint: ${lead.complaint}` : null,
    `Timings:  ${formattedSlots}`,
    lead.notes ? `\nNotes:\n${lead.notes}` : null,
  ]
    .filter((v) => v !== null)
    .join("\n");

  const result = await sendMail({
    to: clinicEmail,
    subject,
    body: textContent,
    html: htmlContent,
  });

  /* Deliberately not thrown. The visitor filled in a form and is owed a
     "we'll call you back"; whether our mail provider accepted the message is
     our problem, and sendMail() has already logged the lead to the server
     console when nothing could deliver it, so it is never simply lost. */
  if (!result.delivered) {
    console.error("[lead] could not deliver the lead email — it is logged above.", {
      name: lead.name,
      phone: lead.phone,
    });
  }

  return { success: result.delivered, provider: result.transport, id: result.id ?? null };
}
