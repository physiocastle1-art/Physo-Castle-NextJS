"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";

/* Port of the CODE-GRID Ashleybrookecs "smudge revealer": a dark foreground
   ("Scratch") with a light layer (the quote) revealed through a gooey,
   dissolving smudge that follows the pointer.

   TOUCH: a phone has no hover, so the same reveal is driven by the finger.
   touchmove stays passive — the page keeps scrolling while you scratch, which
   is the only behaviour that does not feel like the page has frozen. The blur
   radius and the stamp rate are both dialled back on a coarse pointer: the goo
   filter is re-rasterised every frame and a phone GPU cannot afford the
   desktop settings. */
export default function SmudgeReveal() {
  const heroRef = useRef(null);
  const svgRef = useRef(null);
  const blobsRef = useRef(null);
  const blurRef = useRef(null);

  useEffect(() => {
    const hero = heroRef.current;
    const svg = svgRef.current;
    const container = blobsRef.current;
    if (!hero || !svg || !container) return;

    /* Reduced motion is the one case that still skips the interaction outright
       — there is nothing to reveal progressively if nothing may animate. */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      hero.classList.add("smudged", "revealed");
      return;
    }

    const coarse = window.matchMedia("(pointer: coarse)").matches;

    /* A phone repaints the goo filter over the whole card each frame. Half the
       blur and a third of the stamps keeps it at frame rate; the smudge reads
       the same, only slightly tighter. */
    const config = {
      smoothing: coarse ? 0.16 : 0.1,
      movementThreshold: 0.01,
      sizeFromSpeed: coarse ? 0.5 : 0.22,
      minRadius: coarse ? 22 : 0,     // a slow finger still leaves a mark
      stampEveryNthFrame: coarse ? 3 : 1,
      expandMultiplier: 2,
      expandTime: 2,
      expandEase: "power1.inOut",
      dissolveStart: 2,
      dissolveTime: 3,
      dissolveEase: "power3.in",
    };
    if (blurRef.current) blurRef.current.setAttribute("stdDeviation", coarse ? "13" : "25");

    const pointer = { x: 0, y: 0 };
    const smooth = { x: 0, y: 0 };
    let hasStarted = false, raf = 0, frame = 0;
    const tweens = new Set();

    function onMove(x, y) {
      hero.classList.add("smudged");
      if (!hasStarted) { pointer.x = smooth.x = x; pointer.y = smooth.y = y; hasStarted = true; return; }
      pointer.x = x; pointer.y = y;
    }
    const mouse = (e) => { const r = hero.getBoundingClientRect(); onMove(e.clientX - r.left, e.clientY - r.top); };
    const touch = (e) => {
      const t = e.touches[0];
      if (!t) return;
      const r = hero.getBoundingClientRect();
      const x = t.clientX - r.left;
      const y = t.clientY - r.top;
      onMove(x, y);
      if (e.type === "touchstart") {
        stamp(x, y, coarse ? 45 : 35);
      }
    };
    hero.addEventListener("mousemove", mouse);
    hero.addEventListener("touchstart", touch, { passive: true });
    hero.addEventListener("touchmove", touch, { passive: true });

    function sizeSVG() {
      const r = hero.getBoundingClientRect();
      svg.style.width = r.width + "px";
      svg.style.height = r.height + "px";
    }
    sizeSVG();
    window.addEventListener("resize", sizeSVG);

    function stamp(x, y, radius) {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", radius); c.setAttribute("fill", "#fff");
      container.prepend(c);
      const ar = { current: radius };
      const tl = gsap.timeline({
        onUpdate() { c.setAttribute("r", Math.max(0, ar.current)); },
        onComplete() { tl.kill(); tweens.delete(tl); c.remove(); },
      });
      tl.to(ar, { current: radius * config.expandMultiplier, duration: config.expandTime, ease: config.expandEase });
      tl.to(ar, { current: 0, duration: config.dissolveTime, ease: config.dissolveEase }, config.dissolveStart);
      tweens.add(tl);
    }

    function update() {
      if (hasStarted) {
        smooth.x += (pointer.x - smooth.x) * config.smoothing;
        smooth.y += (pointer.y - smooth.y) * config.smoothing;
        const speed = Math.hypot(pointer.x - smooth.x, pointer.y - smooth.y);
        if (speed > config.movementThreshold && frame % config.stampEveryNthFrame === 0) {
          stamp(smooth.x, smooth.y, Math.max(config.minRadius, speed * config.sizeFromSpeed));
        }
      }
      frame++;
      raf = requestAnimationFrame(update);
    }
    raf = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", sizeSVG);
      hero.removeEventListener("mousemove", mouse);
      hero.removeEventListener("touchstart", touch);
      hero.removeEventListener("touchmove", touch);
      tweens.forEach((t) => t.kill());
    };
  }, []);

  return (
    <section className="smudge-hero" ref={heroRef}>
      <span className="smudge-hint">
        <span className="smudge-hint-pointer">Scratch me ✦</span>
        <span className="smudge-hint-touch">Drag to scratch ✦</span>
      </span>
      <div className="hero-content-foreground"><h1>Scratch</h1></div>
      <div className="hero-content-background">
        <h3>Physiotherapy is a Journey to Pain-Free Living.</h3>
      </div>
      <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="smudge-revealer">
        <defs>
          <filter id="smudge-goo">
            <feGaussianBlur ref={blurRef} in="SourceGraphic" stdDeviation="25" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 60 -14" />
          </filter>
        </defs>
        <mask id="smudge-mask" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
          <g ref={blobsRef} className="smudge-blobs" filter="url(#smudge-goo)" />
        </mask>
      </svg>
    </section>
  );
}
