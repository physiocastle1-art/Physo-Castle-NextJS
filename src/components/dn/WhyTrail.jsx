"use client";
/* ─────────────────────────────────────────────────────────────────────────
   One band of plain page between two panels. Moving the mouse across it spawns
   images along the cursor's path — each scaling in where it was dropped, the
   oldest scaling away.

   Only SCALE is animated: the position is fixed at spawn, so a card grows in
   place instead of sliding after the cursor. Opacity is deliberately near
   instant (900 tension) — the readable motion is the scale.
   ───────────────────────────────────────────────────────────────────────── */
import { useEffect, useRef } from "react";
import Link from "next/link";
import { Spring, isCoarsePointer, prefersReducedMotion } from "@/lib/dnMotion";
import { photo, TRAIL_PHOTOS } from "@/lib/dnImages";
import { Words, RevealEl } from "./Words";

const SPAWN_DISTANCE = 90;   // px of pointer travel between two spawns
const TRAIL_LENGTH = 5;      // alive at once; dropping the oldest plays its exit
const MAX_TILT = 12;         // degrees either way
const ENTER_CONFIG = { tension: 130, friction: 28 };
const LEAVE_CONFIG = { tension: 300, friction: 24 };
const OPACITY_CONFIG = { tension: 900, friction: 40 };

const IMAGES = TRAIL_PHOTOS.map((id) => photo(id, 520));

export default function WhyTrail() {
  const secRef = useRef(null);
  const trailRef = useRef(null);

  useEffect(() => {
    const sec = secRef.current;
    const layer = trailRef.current;
    if (!sec || !layer) return;
    // a coarse pointer has no path to leave, and would spawn on every tap
    if (isCoarsePointer() || prefersReducedMotion()) return;

    const alive = [];
    let spawnIndex = 0;
    let last = null;

    const retire = (item) => {
      if (!item || item.dead) return;
      item.dead = true;
      item.scale.set(0, LEAVE_CONFIG);
      item.opacity.set(0, OPACITY_CONFIG);
    };

    const spawn = (x, y) => {
      const el = document.createElement("div");
      el.className = "dn-trail__card";
      const img = document.createElement("img");
      img.src = IMAGES[spawnIndex % IMAGES.length];
      img.alt = "";
      img.loading = "eager";
      el.appendChild(img);
      layer.appendChild(el);
      spawnIndex++;

      const tilt = (Math.random() * 2 - 1) * MAX_TILT;
      const item = { el, dead: false, s: 0, o: 0 };
      const write = () => {
        el.style.transform =
          `translate3d(${x}px,${y}px,0) translate(-50%,-50%) rotate(${tilt.toFixed(2)}deg) scale(${item.s.toFixed(4)})`;
        el.style.opacity = item.o.toFixed(3);
      };
      item.scale = new Spring(0, ENTER_CONFIG, (v) => { item.s = v; write(); }, () => {
        if (item.dead) el.remove();
      });
      item.opacity = new Spring(0, OPACITY_CONFIG, (v) => { item.o = v; write(); });
      write();
      item.scale.set(1);
      item.opacity.set(1);

      alive.push(item);
      while (alive.length > TRAIL_LENGTH) retire(alive.shift());
    };

    const onMove = (e) => {
      if (e.pointerType !== "mouse") return;
      const r = sec.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (last && Math.hypot(x - last.x, y - last.y) < SPAWN_DISTANCE) return;
      last = { x, y };
      spawn(x, y);
    };
    const onLeave = () => {
      last = null;
      while (alive.length) retire(alive.shift());
    };

    sec.addEventListener("pointermove", onMove, { passive: true });
    sec.addEventListener("pointerleave", onLeave);
    return () => {
      sec.removeEventListener("pointermove", onMove);
      sec.removeEventListener("pointerleave", onLeave);
      alive.forEach((i) => { i.scale.stop(); i.opacity.stop(); i.el.remove(); });
    };
  }, []);

  return (
    <section className="dn-sec dn-why" id="dn-why" ref={secRef}>
      <div className="dn-trail" ref={trailRef} aria-hidden="true" />

      <div className="dn-why__copy">
        <span className="eyebrow">
          <Words as="span" preset="eyebrow">Why Physio Castle</Words>
        </span>
        <Words as="h2" preset="heading" center className="title dn-why__title">
          One therapist, one plan, <em>your</em> home
        </Words>
        <Words as="p" preset="body" center className="lede dn-why__lede">
          No referrals across town, no repeated assessments. The therapist who assesses you is the
          therapist who treats you — and the plan changes as your body does.
        </Words>
        <RevealEl className="dn-why__actions">
          <Link href="/testimonials" className="btn btn-gold">Patient stories</Link>
          <Link href="/about" className="btn btn-ghost">How we work <span className="arw">→</span></Link>
        </RevealEl>
      </div>
    </section>
  );
}
