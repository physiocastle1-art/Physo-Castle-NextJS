/* WhatsApp message links — the zero-cost reminder channel.

   No Business API, no per-message fee, no approval queue: every button in the
   admin opens wa.me with the number and the message already filled in, and the
   message is sent from the clinic's own WhatsApp. That means the send itself is
   a human action, which is also why nothing here records a "sent" state — the
   panel cannot know whether you actually pressed send.

   Pure module (no database, no next/headers) so the same templates render on a
   server page and inside a client component. */

import { formatMoney, formatDateTime, formatDate } from "./format.js";

/* wa.me wants digits only, with country code and no "+". Numbers are stored as
   bare 10 digits, so anything of that length gets India's 91 prefixed; a longer
   number is assumed to already carry its country code. */
export function waNumber(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
}

/* Returns null rather than a broken link when there is no usable number, so
   callers can render nothing instead of a dead button. */
export function waLink(phone, message) {
  const number = waNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

const lines = (...parts) => parts.filter(Boolean).join("\n");

/* Every template ends with the clinic's name rather than starting with it —
   WhatsApp previews the first line, and the useful part is the appointment. */

export function sessionReminderText({ patientName, session, clinicName, therapistName }) {
  const when = formatDateTime(session?.scheduledAt);
  const place =
    session?.visitType === "home"
      ? `We will visit you at: ${session.visitAddress || "your address on file"}`
      : "Please arrive 5 minutes early.";

  return lines(
    `Hello ${patientName || "there"},`,
    "",
    `A reminder for your physiotherapy session on ${when}.`,
    session?.number ? `Visit #${session.number} with ${therapistName || "your therapist"}.` : null,
    place,
    "",
    "Reply here if you need to reschedule.",
    `— ${clinicName || "Physio Castle"}`
  );
}

export function duesReminderText({ patientName, billing, clinicName }) {
  const due = formatMoney(billing?.due || 0);
  const instalment =
    billing?.nextInstallment > 0 && billing.nextInstallment < billing.due
      ? `Your next instalment is ${formatMoney(billing.nextInstallment)}.`
      : null;

  return lines(
    `Hello ${patientName || "there"},`,
    "",
    `A gentle reminder that ${due} is pending on your treatment plan.`,
    instalment,
    `Paid so far: ${formatMoney(billing?.paid || 0)} of ${formatMoney(billing?.feeTotal || 0)}.`,
    "",
    "You can pay by UPI, card or cash at your next visit.",
    `— ${clinicName || "Physio Castle"}`
  );
}

/* For the recall list: someone who stopped coming mid-plan. Deliberately warm
   and not about money, even when they also owe — the goal is the next visit. */
export function recallText({ patientName, lastVisitAt, sessionsLeft, clinicName }) {
  return lines(
    `Hello ${patientName || "there"},`,
    "",
    lastVisitAt
      ? `We haven't seen you since ${formatDate(lastVisitAt)} and wanted to check how you are doing.`
      : "We wanted to check how you are doing.",
    sessionsLeft > 0
      ? `You still have ${sessionsLeft} session${sessionsLeft === 1 ? "" : "s"} left in your plan.`
      : null,
    "",
    "Reply here and we'll find a slot that suits you.",
    `— ${clinicName || "Physio Castle"}`
  );
}

export function receiptText({ patientName, payment, billing, clinicName, receiptUrl }) {
  return lines(
    `Hello ${patientName || "there"},`,
    "",
    `Received ${formatMoney(payment?.amount)} on ${formatDate(payment?.paidAt)}. Thank you.`,
    payment?.receiptNo ? `Receipt no: ${payment.receiptNo}` : null,
    billing?.due > 0 ? `Balance remaining: ${formatMoney(billing.due)}` : "Your plan is fully paid.",
    receiptUrl ? `\n${receiptUrl}` : null,
    `— ${clinicName || "Physio Castle"}`
  );
}
