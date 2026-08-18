import { waLink } from "@/lib/whatsapp";

/* One-click reminder. Presentational and hook-free on purpose, so the same
   component works inside a server-rendered table row and inside a client form.

   Renders nothing at all when the patient has no usable number — a button that
   opens a broken wa.me link is worse than no button. */
export default function WhatsAppButton({
  phone,
  message,
  label = "WhatsApp",
  title = "Open WhatsApp with this message ready to send",
  size = "sm",
}) {
  const href = waLink(phone, message);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={title}
      className={`adm-btn adm-btn-wa${size === "sm" ? " adm-btn-sm" : ""}`}
    >
      <span aria-hidden="true">✆</span>
      {label}
    </a>
  );
}
