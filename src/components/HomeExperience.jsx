"use client";
import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

/* Homepage-only premium scroll: Lenis smooth scrolling.
   (The old GSAP snap-to-section was removed — on tall sections like the
   "Care for every stage of life" mosaic it yanked the viewport back up to the
   section's top while you were interacting with the lower content, which read
   as a random "jump up" on click. Free scrolling is more predictable.) */
export default function HomeExperience({ children }) {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 1 });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (t) => lenis.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const t = setTimeout(() => ScrollTrigger.refresh(), 500);

    return () => {
      clearTimeout(t);
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return children;
}
