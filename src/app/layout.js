import "./globals.css";
import SiteChrome from "@/components/SiteChrome";

export const metadata = {
  title: "Dr. Riddhi Shah (PT) — Physiotherapist in Surat | Home Visit Physiotherapy",
  description:
    "Expert home visit physiotherapy in Surat by Dr. Riddhi Shah (PT). Personalised, one-on-one care at your doorstep. Book an appointment, request a callback or a teleconsultation.",
  icons: {
    icon: "/logo/physio-castle-logo.jpg",
    apple: "/logo/physio-castle-logo.jpg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
