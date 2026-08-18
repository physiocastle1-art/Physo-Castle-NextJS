"use client";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

export default function LandingIntro() {
  const root = useRef(null);

  // Hero entrance. No preloader / click-gate any more — the page is scrollable
  // and the hero is readable from the first paint.
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(
        [
          ".hl-left-hero .hl-tagline-sub",
          ".hl-left-hero h1 span",
          ".hl-left-hero h1 em",
          ".hl-left-hero .hl-desc-text",
          ".hl-left-hero .hl-buttons a",
        ],
        { opacity: 0, y: 24, duration: 1.1, ease: "power3.out", stagger: 0.08 }
      );
      gsap.from(".hl-chrome", { opacity: 0, duration: 1.2, ease: "power2.out" });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <header className="hero-landing hero-spline" ref={root}>
      <div className="hl-spline" />
      <div className="seq-grad" />

      {/* Main hero typography & content */}
      <div className="hl-left-hero">
        <span className="hl-tagline-sub">Physiotherapy & Rehabilitation</span>
        <h1 className="hl-title-main">
          <span>Physio</span>
          <em>Castle</em>
        </h1>
        <p className="hl-desc-text">
          Home visit physiotherapy in Surat, led by <strong>Dr. Riddhi Shah (PT)</strong>.
          Personalised, one-on-one care delivered to your doorstep — no waiting rooms, no travel stress, just dedicated recovery in the comfort of your own home.
        </p>
        <div className="hl-buttons">
          <a href="/contact" className="btn btn-gold">Book Appointment</a>
          <a href="/services" className="btn btn-ghost">Explore Treatments</a>
        </div>
      </div>

      <div className="hl-chrome">
        <span className="hl-tag">PC // Studio of Recovery</span>
        <span className="hl-corner hl-corner-l">Book</span>
        <span className="hl-corner hl-corner-r">Recover</span>
        <span className="hl-start">Scroll to begin</span>
      </div>
    </header>
  );
}
