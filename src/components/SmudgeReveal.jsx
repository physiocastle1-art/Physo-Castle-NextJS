"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";

/* Exact port of the CODE-GRID Ashleybrookecs "smudge revealer":
   a dark foreground ("DIG IN") with a light layer (the quote) revealed
   through a gooey, dissolving smudge that follows the cursor. */
export default function SmudgeReveal() {
  const heroRef = useRef(null);
  const svgRef = useRef(null);
  const blobsRef = useRef(null);

  useEffect(() => {
    const hero = heroRef.current;
    const svg = svgRef.current;
    const container = blobsRef.current;
    if (!hero || !svg || !container) return;

    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      // On mobile viewports, skip heavy scratch calculations entirely
      hero.classList.add("smudged");
      return;
    }

    const config = {
      smoothing: 0.1, movementThreshold: 0.01, sizeFromSpeed: 0.22,
      expandMultiplier: 2, expandTime: 2, expandEase: "power1.inOut",
      dissolveStart: 2, dissolveTime: 3, dissolveEase: "power3.in",
    };
    const pointer = { x: 0, y: 0 };
    const smooth = { x: 0, y: 0 };
    let hasStarted = false, raf = 0;
    const tweens = new Set();

    function onMove(x, y) {
      hero.classList.add("smudged");
      if (!hasStarted) { pointer.x = smooth.x = x; pointer.y = smooth.y = y; hasStarted = true; return; }
      pointer.x = x; pointer.y = y;
    }
    const mouse = (e) => { const r = hero.getBoundingClientRect(); onMove(e.clientX - r.left, e.clientY - r.top); };
    const touch = (e) => { const r = hero.getBoundingClientRect(); const t = e.touches[0]; onMove(t.clientX - r.left, t.clientY - r.top); };
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
        if (speed > config.movementThreshold) stamp(smooth.x, smooth.y, speed * config.sizeFromSpeed);
      }
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
      <span className="smudge-hint">Scratch me ✦</span>
      <div className="hero-content-foreground"><h1>Scratch</h1></div>
      <div className="hero-content-background">
        <h3 style={{ whiteSpace: "nowrap", width: "95%" }}>Physiotherapy is a Journey to Pain-Free Living.</h3>
      </div>
      <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="smudge-revealer">
        <defs>
          <filter id="smudge-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="25" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 60 -14" />
          </filter>
        </defs>
        <mask id="smudge-mask">
          <g ref={blobsRef} className="smudge-blobs" filter="url(#smudge-goo)" />
        </mask>
      </svg>
    </section>
  );
}
