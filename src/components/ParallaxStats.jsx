"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/* Pinned dark band that bridges out of the hero: a background photo parallaxes
   (slow drift + slight scale) on scrub while the headline reveals and the stat
   counters tick up once the band enters view. Lenis/ScrollTrigger are already
   wired globally in HomeExperience, so this only adds its own triggers. */
const STATS = [
  ["8", "", "Years in practice"],
  ["500", "+", "Patients restored"],
  ["12", "k", "Sessions delivered"],
  ["96", "%", "Would refer a friend"],
];

export default function ParallaxStats() {
  const root = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = root.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Parallax + headline reveal, scrubbed against the pinned scroll.
      if (!reduce) {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: `+=${window.innerHeight}`,
            pin: true,
            pinSpacing: true,
            scrub: 1,
          },
        });
        tl.fromTo(".pstat-bg", { yPercent: -10, scale: 1.22 }, { yPercent: 10, scale: 1.06, ease: "none" }, 0)
          .fromTo(".pstat-eyebrow", { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, ease: "power2.out", duration: 0.25 }, 0.04)
          .fromTo(".pstat-word", { autoAlpha: 0, yPercent: 110 }, { autoAlpha: 1, yPercent: 0, ease: "power3.out", duration: 0.4, stagger: 0.08 }, 0.08);
      } else {
        gsap.set([".pstat-eyebrow", ".pstat-word"], { autoAlpha: 1, y: 0, yPercent: 0 });
      }

      // Count the numbers up once the band scrolls into view.
      const nums = el.querySelectorAll(".pstat-num");
      ScrollTrigger.create({
        trigger: el,
        start: "top 75%",
        once: true,
        onEnter: () => {
          nums.forEach((node) => {
            const target = Number(node.dataset.to);
            if (reduce) { node.textContent = target; return; }
            const obj = { v: 0 };
            gsap.to(obj, {
              v: target,
              duration: 1.6,
              ease: "power2.out",
              onUpdate: () => { node.textContent = Math.round(obj.v); },
            });
          });
        },
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section className="pstat snap-sec" ref={root}>
      <div className="pstat-bg" />
      <div className="pstat-grad" />
      <div className="pstat-inner wrap">
        <span className="pstat-eyebrow eyebrow">Recovery, measured</span>
        <h2 className="pstat-title">
          <span className="pstat-line"><span className="pstat-word">We don&apos;t chase</span> <span className="pstat-word">symptoms.</span></span>
          <span className="pstat-line"><span className="pstat-word">We restore</span> <em className="pstat-word">movement</em><span className="pstat-word">&nbsp;—</span></span>
          <span className="pstat-line"><span className="pstat-word">and measure</span> <span className="pstat-word">every step.</span></span>
        </h2>

        <div className="pstat-row">
          {STATS.map(([num, suffix, label], i) => (
            <div className="pstat-cell" key={label}>
              <div className="pstat-figure">
                <span className="pstat-num" data-to={num}>0</span>
                <span className="pstat-suffix">{suffix}</span>
              </div>
              <p className="pstat-label">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
