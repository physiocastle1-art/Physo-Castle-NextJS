"use client";
/* ─────────────────────────────────────────────────────────────────────────
   Sticky drag-and-glide rail with a live progress bar.

   Native overflow-x: auto plus a pointer-capture drag layered on top — wheel,
   trackpad, touch and keyboard come free; a mouse cannot drag it otherwise.
   The drag sets a TARGET and the ticker eases scrollLeft toward it: that is
   what turns a 1:1 grab into a glide.

   No scroll-snap: snap-mandatory re-snaps whenever the layout shifts, and this
   section changes height as it becomes sticky — the rail would silently land on
   card two before anyone touched it.
   ───────────────────────────────────────────────────────────────────────── */
import { useEffect, useRef } from "react";
import Link from "next/link";
import { Spring, subscribe, clamp } from "@/lib/dnMotion";
import { Words } from "./Words";

const GLIDE = 0.18;          // fraction of the remaining distance closed each frame
const MOMENTUM = 14;         // frames' worth of release velocity carried past the release
const SETTLE_PX = 0.5;       // below this the glide ends and native scrolling resumes
const DRAG_THRESHOLD = 4;    // px past which a press is a drag, not a click
const MIN_FILL = 890 / 1360; // the bar's resting fill
const PROGRESS_CONFIG = { tension: 260, friction: 38 };

const ARROW = (
  <svg className="dn-arw" viewBox="0 0 19.0049 19" aria-hidden="true">
    <path d="M19.0049 1.18457H19.002V18.3564H17.8047V2.21973L0.84668 19L0 18.1621L17.1582 1.18457H0.453125V0H19.0049V1.18457Z" fill="currentColor" />
  </svg>
);

const SOCIALS = [
  ["https://instagram.com", "Instagram", "◎"],
  ["https://facebook.com", "Facebook", "f"],
  ["https://wa.me/919512346056", "WhatsApp", "✆"],
  ["https://youtube.com", "YouTube", "▶"],
];

const REVIEWS = [
  ["Aarti M.", "Orthopaedic rehab", "After my knee surgery I could barely walk. Dr. Riddhi built a plan that actually made sense — three months later I'm back to my morning runs."],
  ["Rohan D.", "Neuro rehab (family)", "The home visits were a blessing for my father's stroke recovery. Patient, skilled and so kind. We saw real progress every single week."],
  ["Sneha P.", "Low back pain", "My chronic back pain is finally gone. What I loved most was being taught how to prevent it from coming back, not just treating it."],
  ["Kavya N.", "Women's health", "The post-natal programme helped me feel like myself again. Gentle, private and genuinely caring."],
  ["Vikram S.", "Cardiorespiratory rehab", "Recovering after CABG surgery felt overwhelming until I started here. My breathing and stamina improved more than I imagined possible."],
];

export default function StoriesRail() {
  const railRef = useRef(null);
  const barRef = useRef(null);

  useEffect(() => {
    const rail = railRef.current;
    const bar = barRef.current;
    if (!rail || !bar) return;

    const fill = new Spring(MIN_FILL, PROGRESS_CONFIG, (v) => {
      bar.style.transform = `scaleX(${v.toFixed(4)})`;
    });
    const maxScroll = () => Math.max(rail.scrollWidth - rail.clientWidth, 0);
    const syncBar = () => {
      const max = maxScroll();
      const p = max > 0 ? rail.scrollLeft / max : 0;
      fill.set(MIN_FILL + (1 - MIN_FILL) * p);
    };

    let target = 0, glide = null, dragging = false, moved = false;
    let startX = 0, startScroll = 0, lastX = 0, vel = 0;

    const stopGlide = () => { if (glide) { glide(); glide = null; } target = rail.scrollLeft; };
    const startGlide = () => {
      if (glide) return;
      glide = subscribe(() => {
        const diff = target - rail.scrollLeft;
        if (Math.abs(diff) < SETTLE_PX) { rail.scrollLeft = target; stopGlide(); return; }
        rail.scrollLeft += diff * GLIDE;
      });
    };

    const onDown = (e) => {
      if (e.pointerType === "touch") return;   // native touch scrolling is better
      e.preventDefault();                      // the browser's own image drag steals the pointer stream
      dragging = true; moved = false;
      startX = e.clientX; lastX = e.clientX; vel = 0;
      startScroll = rail.scrollLeft;
      stopGlide();
      try { rail.setPointerCapture(e.pointerId); } catch { /* capture is best-effort */ }
    };
    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > DRAG_THRESHOLD) moved = true;
      vel = e.clientX - lastX; lastX = e.clientX;
      rail.scrollLeft = clamp(startScroll - dx, 0, maxScroll());
      syncBar();
    };
    const onUp = (e) => {
      if (!dragging) return;
      dragging = false;
      try { rail.releasePointerCapture(e.pointerId); } catch { /* already released */ }
      if (moved) { target = clamp(rail.scrollLeft - vel * MOMENTUM, 0, maxScroll()); startGlide(); }
    };
    // swallow the click in the CAPTURE phase so a drag never opens a card
    const onClick = (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } };

    rail.addEventListener("pointerdown", onDown);
    rail.addEventListener("pointermove", onMove);
    rail.addEventListener("pointerup", onUp);
    rail.addEventListener("pointercancel", onUp);
    rail.addEventListener("click", onClick, true);
    rail.addEventListener("scroll", syncBar, { passive: true });
    syncBar();

    return () => {
      rail.removeEventListener("pointerdown", onDown);
      rail.removeEventListener("pointermove", onMove);
      rail.removeEventListener("pointerup", onUp);
      rail.removeEventListener("pointercancel", onUp);
      rail.removeEventListener("click", onClick, true);
      rail.removeEventListener("scroll", syncBar);
      if (glide) glide();
      fill.stop();
    };
  }, []);

  return (
    <section className="dn-sec dn-stories" id="dn-stories">
      <div className="dn-stories__box">
        <div className="dn-stories__rail" ref={railRef} tabIndex={0} aria-label="Patient stories">
          <article className="dn-story dn-story--intro">
            <span className="eyebrow eyebrow--light">
              <Words as="span" preset="eyebrow">Patient stories</Words>
            </span>
            <h2 className="dn-story__head">The words that matter most come after the recovery.</h2>
            <div className="dn-socials">
              {SOCIALS.map(([href, label, glyph]) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>{glyph}</a>
              ))}
            </div>
          </article>

          {REVIEWS.map(([name, role, text]) => (
            <article className="dn-story dn-story--quote" key={name}>
              <span className="dn-story__stars">★★★★★</span>
              <p className="dn-story__text">{`“${text}”`}</p>
              <div className="dn-plate">
                <span className="dn-plate__name">{name}</span>
                <span className="dn-plate__role">{role}</span>
              </div>
            </article>
          ))}

          <article className="dn-story dn-story--tail">
            <h3 className="dn-story__head">And 200+ more reviews</h3>
            <Link className="dn-card__cta" href="/testimonials">
              <span>Read all</span>
              <span className="dn-ring">{ARROW}</span>
            </Link>
          </article>
        </div>

        <div className="dn-bar"><div className="dn-bar__fill" ref={barRef} /></div>
      </div>
    </section>
  );
}
