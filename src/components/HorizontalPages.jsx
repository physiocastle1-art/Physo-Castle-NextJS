"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/* A pinned horizontal-scroll act: two full-screen "pages" pan to the right as
   you scroll, GSAP snaps to each one, and the global <Brain3D/> overlay reads
   `data-brain-progress` off this section to travel left -> right alongside the
   panels. When the act finishes it unpins and normal vertical scroll resumes. */
export default function HorizontalPages() {
  const root = useRef(null);
  const track = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = root.current;
    const tk = track.current;
    if (!el || !tk) return;

    const ctx = gsap.context(() => {
      const panels = tk.children.length; // 2
      const distance = () => window.innerHeight * panels; // scroll length of the act

      const tl = gsap.to(tk, {
        xPercent: -100 * (panels - 1),
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: () => "+=" + distance(),
          pin: true,
          pinSpacing: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          snap: { snapTo: 1 / (panels - 1), duration: { min: 0.2, max: 0.5 }, ease: "power2.inOut" },
          onUpdate: (self) => { el.dataset.brainProgress = self.progress.toFixed(4); },
          onRefresh: () => { el.dataset.brainProgress = "0"; },
        },
      });

      // gentle reveal of each panel's copy as it slides in
      gsap.utils.toArray(".hpage").forEach((p) => {
        const items = p.querySelectorAll(".hp-fade");
        gsap.fromTo(
          items,
          { autoAlpha: 0, y: 40 },
          {
            autoAlpha: 1, y: 0, ease: "power3.out", stagger: 0.08,
            scrollTrigger: { trigger: p, containerAnimation: tl, start: "left center", toggleActions: "play none none reverse" },
          }
        );
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section className="hpages" ref={root} data-brain-progress="0">
      <div className="hpages-track" ref={track}>
        <article className="hpage hpage-1">
          <span className="hp-eyebrow hp-fade">02 — The Method</span>
          <h2 className="hp-title hp-fade">Assess.<br /><em>Then</em> act.</h2>
          <p className="hp-lede hp-fade">
            Every plan starts with a full-body movement screen — not a guess. We map the
            chain from joint to muscle to nerve, then build the shortest path back to
            strength.
          </p>
          <span className="hp-index hp-fade">01 / 02</span>
        </article>

        <article className="hpage hpage-2">
          <span className="hp-eyebrow hp-fade">03 — The Outcome</span>
          <h2 className="hp-title hp-fade">Move like<br />it never <em>happened</em>.</h2>
          <p className="hp-lede hp-fade">
            Recovery you can measure — range, load, and confidence tracked session over
            session, until the thing that stopped you is just a story you tell.
          </p>
          <span className="hp-index hp-fade">02 / 02</span>
        </article>
      </div>
      <span className="hpages-hint">Scroll — the story moves →</span>
    </section>
  );
}
