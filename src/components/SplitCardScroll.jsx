"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

/* Port of the CODE-GRID RedoMedia split-card scroll animation, adapted to the
   four-step "How we work" (Book · Assess · Treat · Recover). */
const CARDS = [
  ["01", "Book", "Reserve a slot online, by phone, or request a home visit.", "https://picsum.photos/seed/pc-book/620/860"],
  ["02", "Assess", "A thorough evaluation and movement screening to find the root cause.", "https://picsum.photos/seed/pc-assess/620/860"],
  ["03", "Treat", "Hands-on therapy, exercise and modalities, adjusted as your body responds.", "https://picsum.photos/seed/pc-treat/620/860"],
  ["04", "Recover", "Guided progression, education and prevention so your results last.", "https://picsum.photos/seed/pc-recover/620/860"],
];

export default function SplitCardScroll() {
  const root = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis();
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (t) => lenis.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const el = root.current;
    const cardContainer = el.querySelector(".card-container");
    const stickyHeader = el.querySelector(".sticky-header h1");
    const cards = el.querySelectorAll(".card");
    const first = cards[0];
    const last = cards[cards.length - 1];
    let gapDone = false, flipDone = false;

    const mm = gsap.matchMedia();

    mm.add("(max-width: 999px)", () => {
      el.querySelectorAll(".card, .card-container, .sticky-header h1").forEach((e) => e.removeAttribute("style"));
      return () => {};
    });

    mm.add("(min-width: 1000px)", () => {
      const st = ScrollTrigger.create({
        trigger: el.querySelector(".sticky"),
        start: "top top",
        end: `+=${window.innerHeight * 4}px`,
        scrub: 1, pin: true, pinSpacing: true,
        onUpdate: (self) => {
          const p = self.progress;

          if (p >= 0.1 && p <= 0.25) {
            const hp = gsap.utils.mapRange(0.1, 0.25, 0, 1, p);
            gsap.set(stickyHeader, { y: gsap.utils.mapRange(0, 1, 40, 0, hp), opacity: hp });
          } else if (p < 0.1) gsap.set(stickyHeader, { y: 40, opacity: 0 });
          else gsap.set(stickyHeader, { y: 0, opacity: 1 });

          if (p <= 0.25) gsap.set(cardContainer, { width: `${gsap.utils.mapRange(0, 0.25, 80, 62, p)}%` });
          else gsap.set(cardContainer, { width: "62%" });

          if (p >= 0.35 && !gapDone) {
            gsap.to(cardContainer, { gap: "20px", duration: 0.5, ease: "power3.out" });
            gsap.to(cards, { borderRadius: "20px", duration: 0.5, ease: "power3.out" });
            gapDone = true;
          } else if (p < 0.35 && gapDone) {
            gsap.to(cardContainer, { gap: "0px", duration: 0.5, ease: "power3.out" });
            gsap.to(first, { borderRadius: "20px 0 0 20px", duration: 0.5, ease: "power3.out" });
            gsap.to(last, { borderRadius: "0 20px 20px 0", duration: 0.5, ease: "power3.out" });
            cards.forEach((c) => { if (c !== first && c !== last) gsap.to(c, { borderRadius: "0px", duration: 0.5, ease: "power3.out" }); });
            gapDone = false;
          }

          if (p >= 0.7 && !flipDone) {
            gsap.to(cards, { rotationY: 180, duration: 0.75, ease: "power3.inOut", stagger: 0.1 });
            gsap.to(first, { y: 30, rotationZ: -15, duration: 0.75, ease: "power3.inOut" });
            gsap.to(last, { y: 30, rotationZ: 15, duration: 0.75, ease: "power3.inOut" });
            flipDone = true;
          } else if (p < 0.7 && flipDone) {
            gsap.to(cards, { rotationY: 0, duration: 0.75, ease: "power3.inOut", stagger: -0.1 });
            gsap.to([first, last], { y: 0, rotationZ: 0, duration: 0.75, ease: "power3.inOut" });
            flipDone = false;
          }
        },
      });
      return () => st && st.kill();
    });

    return () => { mm.revert(); gsap.ticker.remove(tick); lenis.destroy(); };
  }, []);

  return (
    <div className="splitcards" ref={root}>
      <section className="sc-intro">
        <div>
          <span className="eyebrow" style={{ justifyContent: "center" }}>How we work</span>
          <h1>A four-step path from pain to performance.</h1>
        </div>
      </section>

      <section className="sticky">
        <div className="sticky-header"><h1>Book · Assess · Treat · Recover</h1></div>
        <div className="card-container">
          {CARDS.map(([num, name, desc, img], i) => (
            <div className="card" id={`sc-card-${i + 1}`} key={num}>
              <div className="card-front">
                <img src={img} alt="" />
                <span className="card-step">{name}</span>
              </div>
              <div className="card-back">
                <span>( {num} )</span>
                <div className="cb-inner"><h3>{name}</h3><p>{desc}</p></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="sc-outro"><h1>Every step leaves you stronger.</h1></section>
    </div>
  );
}
