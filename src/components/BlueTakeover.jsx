"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const FAQ = [
  { q: "Do I need a doctor's referral?", a: "No — you can book directly with us and we'll coordinate any further care you need." },
  { q: "Do you offer home visits & online?", a: "Yes — clinic visits, home visits, and teleconsultation by video." },
  { q: "How long is each appointment?", a: "First assessment is 45–60 min; follow-ups are 30–45 min." },
  { q: "How many sessions will I need?", a: "After your assessment we give an honest estimate and clear milestones." },
];

/* Pinned "blue takeover": the screen fills blue on scroll, then the FAQ slides
   in from the right. (Pins an inner section; stable wrapper avoids React/pin
   removeChild issues.) */
export default function BlueTakeover() {
  const root = useRef(null);
  const pinRef = useRef(null);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (isMobile) {
      // Static presentation on mobile viewports: set styles directly & skip heavy ScrollTrigger pinning
      gsap.set(".takeover-bg", { backgroundColor: "#122119" });
      gsap.set(".tk-ink", { color: "#ffffff" });
      gsap.set(".tk-line", { backgroundColor: "rgba(255,255,255,.6)" });
      gsap.set(".tk-faq", { opacity: 1, visibility: "inherit", xPercent: 0 });
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    const el = pinRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el, start: "top top",
          end: `+=${window.innerHeight * 2.6}`,
          pin: true, pinSpacing: true, scrub: 1,
        },
      });
      tl.to(".takeover-bg", { backgroundColor: "#122119", duration: 0.25 }, 0)
        .to(".tk-ink", { color: "#ffffff", duration: 0.25 }, 0)
        .to(".tk-line", { backgroundColor: "rgba(255,255,255,.6)", duration: 0.25 }, 0)
        .from(".tk-faq", { xPercent: 130, autoAlpha: 0, stagger: 0.18, duration: 0.7, ease: "power2.out" }, 0.32);
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div className="takeover-root brain-hide" ref={root}>
      <section className="takeover" ref={pinRef}>
        <div className="takeover-bg" />
        <div className="takeover-grid">
          <div className="takeover-left">
            <span className="eyebrow tk-ink"><span className="tk-line" />Ready when you are</span>
            <h2 className="takeover-title tk-ink">Book your assessment — at the clinic or in your home.</h2>
            <div className="takeover-cta">
              <Link href="/contact" className="tk-btn">Book Appointment <span className="arw">→</span></Link>
              <Link href="/contact" className="tk-link tk-ink">Consult online →</Link>
            </div>
          </div>
          <div className="takeover-right">
            <span className="tk-faq-kicker">FAQ — questions, answered</span>
            <div className="takeover-faq">
              {FAQ.map((f, i) => (
                <div className="tk-faq" key={i}>
                  <h3>{f.q}</h3>
                  <p>{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
