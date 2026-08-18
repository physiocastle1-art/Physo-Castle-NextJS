import { Suspense } from "react";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import BookingForm from "@/components/BookingForm";

export const metadata = { title: "Book an Appointment — Physio Castle" };

export default function Contact() {
  return (
    <>
      <header className="page-hero">
        <div className="orb a" /><div className="orb b" />
        <div className="wrap">
          <Reveal as="span" className="crumb"><Link href="/">Home</Link> / Contact</Reveal>
          <Reveal as="h1" delay={1} className="display" style={{ fontSize: "clamp(2.6rem,7vw,6rem)" }}>Book your <em>visit</em></Reveal>
          <Reveal as="p" delay={2} className="lede mt-s">Choose what suits you — a home visit in your own space, or an online teleconsultation. We&apos;ll confirm your slot within 24 hours.</Reveal>
        </div>
      </header>

      <section className="section tight">
        <div className="wrap">
          <div className="split split-contact">
            {/* BookingForm reads ?parts= from the symptom check via
                useSearchParams, which needs a boundary for this page to stay
                statically prerendered rather than becoming request-rendered. */}
            <Reveal>
              <Suspense fallback={<div className="form-card" style={{ minHeight: 620 }} />}>
                <BookingForm />
              </Suspense>
            </Reveal>
            <Reveal delay={1} className="contact-aside">
              <div className="cinfo"><div className="ic">✆</div><div><b>Call or WhatsApp</b><p>+91 95123 46056<br />Mon–Sat, 8am – 8pm</p></div></div>
              <div className="cinfo"><div className="ic">✉</div><div><b>Email</b><p>hello@physiocastle.com</p></div></div>
              <div className="cinfo"><div className="ic">⌂</div><div><b>Clinic</b><p>Physio Castle Studio<br />Surat, Gujarat</p></div></div>
              <div className="cinfo"><div className="ic">◷</div><div><b>Hours</b><p>Mon – Sat: 8am – 8pm<br />Sunday: by appointment</p></div></div>
              <div className="card" style={{ background: "linear-gradient(120deg,rgba(63,122,106,.16),rgba(168,127,61,.12))", borderColor: "var(--line)" }}>
                <span className="eyebrow">Not sure where to start?</span>
                <p className="muted mt-s" style={{ fontSize: ".92rem" }}>Take the 60-second symptom check and we&apos;ll point you to the right care.</p>
                <Link href="/symptoms" className="btn btn-ghost mt-s">Check my symptoms <span className="arw">→</span></Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
