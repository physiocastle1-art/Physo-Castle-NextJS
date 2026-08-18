"use client";
import { usePathname } from "next/navigation";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import FloatingActions from "@/components/FloatingActions";
import TransitionProvider from "@/components/TransitionProvider";

/* The public site's navbar, footer, floating buttons and page-transition
   overlay. The admin panel has its own shell and must not inherit the
   marketing chrome — in particular TransitionProvider, which hijacks every
   link click for the gold wipe animation. */
export default function SiteChrome({ children }) {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) return children;

  return (
    <TransitionProvider>
      <NavBar />
      {children}
      <Footer />
      <FloatingActions />
    </TransitionProvider>
  );
}
