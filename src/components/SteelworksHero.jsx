"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";

const CARDS = [
  ["Orthopaedic", "/svc-1.jpg", "svc-01"],
  ["Neurological", "/svc-2.jpg", "svc-02"],
  ["Cardiorespiratory", "/svc-3.jpg", "svc-03"],
  ["Women's Health", "/svc-4.jpg", "svc-04"],
  ["Stress & Wellness", "/svc-5.jpg", "svc-05"],
];

/* Steelworks-style reveal that resolves into a clickable 5-image gallery.
   Replays on every mount; click a card to jump to that service. */
export default function SteelworksHero() {
  const root = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(SplitText, CustomEase);
    CustomEase.create("hop", "0.9, 0, 0.1, 1");
    CustomEase.create("glide", "0.8, 0, 0.2, 1");
    const el = root.current;
    if (!el) return;
    let split;
    let active = true;
    const ctx = gsap.context(() => {
      const run = () => {
        if (!active) return;
        const cards = el.querySelectorAll(".sw-card");
        const rotations = [-12, 7, -8, 9, -3];

        split = SplitText.create(el.querySelectorAll(".sw-h1, .sw-social p, .sw-social a"), {
          type: "lines", linesClass: "line", mask: "lines", autoSplit: true,
        });
        gsap.set(el.querySelectorAll(".line"), { y: "125%" });
        gsap.set(cards, { opacity: 1 });

        const tl = gsap.timeline({ delay: 0.4 });
        tl.to(el.querySelector(".preloader"), {
          scaleX: 1, duration: 1.3, ease: "glide",
          onComplete: () => gsap.set(el.querySelector(".preloader"), { transformOrigin: "right" }),
        });
        tl.to(el.querySelector(".preloader"), { scaleX: 0, duration: 1.1, ease: "hop" });
        tl.to(el.querySelector(".preloader-overlay"), { clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)", duration: 0.9, ease: "hop" }, "<0.6");

        tl.from(cards, {
          yPercent: 130, scale: 0.5, opacity: 0,
          rotation: (i) => rotations[i],
          duration: 1.2, ease: "glide", stagger: 0.08,
        }, "<0.15");

        tl.to(el.querySelectorAll(".sw-h1 .line"), { y: "0%", duration: 1, stagger: 0.1, ease: "power3.out" }, "<0.3");
        tl.to(el.querySelectorAll(".sw-social .line"), { y: "0%", duration: 1, stagger: 0.1, ease: "power3.out" }, "<0.2");
      };
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
      else run();
    }, root);

    return () => {
      active = false;
      split && split.revert && split.revert();
      ctx.revert();
    };
  }, []);

  const go = (id) => {
    const t = document.getElementById(id);
    if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="sw-hero" ref={root}>
      <div className="preloader-overlay"><div className="preloader" /></div>

      <div className="sw-header"><h1 className="sw-h1">Recovery, designed around you — choose where it begins.</h1></div>

      <div className="sw-gallery">
        {CARDS.map(([label, img, id]) => (
          <button className="sw-card" key={id} onClick={() => go(id)} aria-label={label}>
            <span className="sw-card-img"><img src={img} alt={label} /></span>
            <span className="sw-card-label">{label}<i>↗</i></span>
          </button>
        ))}
      </div>

      <div className="sw-social">
        <p>Say Hello</p>
        <a href="mailto:hello@physiocastle.com">hello@physiocastle.com</a>
      </div>
    </section>
  );
}
