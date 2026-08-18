import "server-only";

/* Outbound mail. No SMTP configured yet, so links are printed to the server
   console — watch the terminal running `npm run dev`.

   To go live: replace the body of sendMail() with a Resend / nodemailer call.
   Nothing else in the app needs to change. */
export async function sendMail({ to, subject, body }) {
  const line = "─".repeat(64);
  console.log(
    `\n${line}\n📧  EMAIL (console transport — not actually sent)\n` +
      `    To:      ${to}\n    Subject: ${subject}\n${line}\n${body}\n${line}\n`
  );
  return { delivered: false, transport: "console" };
}

export function appUrl(path = "") {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}
