"use client";
/* ─────────────────────────────────────────────────────────────────────────
   About — carries margin-top: -100lvh, so it rides up over the pinned Services
   panel as you scroll. A parallax banner, four counting statistics, and a
   paragraph whose unimportant clauses are greyed.
   ───────────────────────────────────────────────────────────────────────── */
import { useEffect, useRef } from "react";
import Link from "next/link";
import { Spring, subscribe, clamp, prefersReducedMotion } from "@/lib/dnMotion";
import { photo, ABOUT_BANNER } from "@/lib/dnImages";
import { Words, RevealEl } from "./Words";

const DRIFT_CONFIG = { tension: 180, friction: 40 };
const COUNT_CONFIG = { tension: 22, friction: 26 };   // long and heavily damped: it
                                                      // decelerates in, it does not tick

const STATS = [
  ["200+", "Google reviews"],
  ["98%", "Would recommend"],
  ["24h", "Booking confirmed within"],
  ["6", "Specialised programmes"],
];

/* Split once into prefix / number / suffix and animate only the number, so the
   markup never changes width and the layout never shifts. */
function Counter({ value }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const m = String(value).match(/^(\D*)(\d+)(\D*)$/);
    if (!m) return;
    const target = Number(m[2]);
    if (prefersReducedMotion()) return;

    const spring = new Spring(0, COUNT_CONFIG, (v) => { el.textContent = String(Math.round(v)); });
    spring.jump(0);
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => (e.isIntersecting ? spring.set(target) : spring.jump(0))),
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => { io.disconnect(); spring.stop(); };
  }, [value]);

  const m = String(value).match(/^(\D*)(\d+)(\D*)$/);
  if (!m) return <>{value}</>;
  // the full string stays the accessible name while the digits move
  return (
    <span aria-label={String(value)}>
      <span aria-hidden="true">{m[1]}</span>
      <span aria-hidden="true" ref={ref}>{m[2]}</span>
      <span aria-hidden="true">{m[3]}</span>
    </span>
  );
}

export default function AboutOverlay() {
  const frameRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    const frame = frameRef.current;
    const img = imgRef.current;
    if (!frame || !img || prefersReducedMotion()) return;

    const drift = new Spring(0.5, DRIFT_CONFIG, (p) => {
      img.style.transform = `translateY(${((p - 0.5) * 25).toFixed(3)}%)`;
    });
    const unsub = subscribe(() => {
      const r = frame.getBoundingClientRect();
      if (r.bottom < -200 || r.top > window.innerHeight + 200) return;
      const p = clamp((window.innerHeight - r.top) / (window.innerHeight + r.height), 0, 1);
      drift.set(p);
    });
    return () => { unsub(); drift.stop(); };
  }, []);

  return (
    <section className="dn-sec dn-about" id="dn-about">
      <figure className="dn-about__banner" ref={frameRef}>
        {/* the image is 25% taller than its frame so it can drift against the scroll */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={imgRef} src={photo(ABOUT_BANNER, 1800)} alt="Hands-on physiotherapy treatment" loading="lazy" />
      </figure>

      <div className="dn-about__row">
        <div className="dn-about__left">
          <span className="eyebrow"><Words as="span" preset="eyebrow">About the practice</Words></span>
          <dl className="dn-stats">
            {STATS.map(([fig, label]) => (
              <div className="dn-stat" key={label}>
                <dt className="dn-stat__fig"><Counter value={fig} /></dt>
                <dd className="dn-stat__label">{label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="dn-about__right">
          <Words as="p" preset="body" className="dn-about__para">
            <span className="dn-muted">Physio Castle is a home-visit practice built on a single idea:</span>{" "}
            <span>assessment and treatment should never be separated.</span>{" "}
            <span className="dn-muted">Hands-on therapy, exercise and education happen in your own space,</span>{" "}
            <span>and the plan is rewritten as your body changes.</span>
          </Words>
          <RevealEl className="dn-about__actions">
            <Link href="/contact" className="btn btn-gold">Book a consultation</Link>
            <Link href="/about" className="btn btn-ghost">Our story <span className="arw">→</span></Link>
          </RevealEl>
        </div>
      </div>
    </section>
  );
}
