import "server-only";
import { Resend } from "resend";
import nodemailer from "nodemailer";

/* Outbound mail — the ONE place a provider is configured.

   Tries Resend, then SMTP, then falls back to printing the message to the
   server console. The fallback exists so a local checkout with no credentials
   still works: the invite link is in the terminal running `npm run dev`.

   In production that fallback is a trap rather than a feature, because
   forgot-password cannot hand the link back to the caller — doing so would let
   anyone reset anyone's password — so an undelivered reset reaches nobody.
   `delivered` is therefore returned honestly, and callers that CAN degrade
   (the staff invite routes) use it to hand the link to the inviter instead. */

const senderAddress = () => process.env.EMAIL_FROM || "onboarding@resend.dev";

const smtpConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/* These messages are plain text built in the route handlers, but a bare URL in
   an HTML part is not clickable — and the URL is the entire point of an invite
   or a reset. Escape first, then linkify, so the linkifier can only ever match
   text we already made safe. */
function textToHtml(text) {
  const linked = esc(text).replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:#2a523b">$1</a>'
  );
  return (
    `<div style="font-family:-apple-system,'Segoe UI',Tahoma,sans-serif;` +
    `font-size:15px;line-height:1.6;color:#17231c;white-space:pre-wrap">${linked}</div>`
  );
}

function logToConsole(to, subject, body, reason) {
  const line = "─".repeat(64);
  console.log(
    `\n${line}\n📧  EMAIL NOT SENT — ${reason}\n` +
      `    To:      ${to}\n    Subject: ${subject}\n${line}\n${body}\n${line}\n`
  );
}

/* Returns { delivered, transport, id?, error? }. Never throws: a clinic must
   still be able to add a staff member when the mail provider is down, and the
   caller decides what an undelivered message means. */
export async function sendMail({ to, subject, body = "", html = null }) {
  const htmlPart = html || textToHtml(body);
  const from = senderAddress();
  let lastError = null;

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const resend = new Resend(apiKey);
      /* The Resend SDK reports a rejection in the RESOLVED value rather than by
         throwing, so a send that was refused — an unverified sender domain,
         most often — looks like success unless `error` is checked. */
      const { data, error } = await resend.emails.send({
        from,
        to: [to],
        subject,
        text: body,
        html: htmlPart,
      });

      if (error) throw new Error(error.message || "Resend rejected the message.");
      return { delivered: true, transport: "resend", id: data?.id ?? null };
    } catch (err) {
      lastError = err?.message || String(err);
      console.error(`[mail] Resend failed for ${to}: ${lastError}`);
    }
  }

  if (smtpConfigured()) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });

      const info = await transporter.sendMail({ from, to, subject, text: body, html: htmlPart });
      return { delivered: true, transport: "smtp", id: info?.messageId ?? null };
    } catch (err) {
      lastError = err?.message || String(err);
      console.error(`[mail] SMTP failed for ${to}: ${lastError}`);
    }
  }

  logToConsole(
    to,
    subject,
    body,
    lastError
      ? `every transport failed (${lastError})`
      : "no RESEND_API_KEY or SMTP credentials configured"
  );
  return { delivered: false, transport: "console", error: lastError };
}

export function appUrl(path = "") {
  /* Production MUST set APP_URL. Without it every invite and reset link points
     at localhost and is useless to the person who receives it — and because the
     link is generated server-side there is nothing downstream that could
     notice and correct it. */
  const configured = process.env.APP_URL;
  if (!configured && process.env.NODE_ENV === "production") {
    console.error("[mail] APP_URL is not set — invite and reset links will point at localhost.");
  }
  const base = (configured || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}
