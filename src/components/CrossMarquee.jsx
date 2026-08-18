"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const A = ["Orthopaedic Rehab", "Neurological Rehab", "Cardiorespiratory", "Women's Health"];
const B = ["Stress Management", "Fitness & Yoga", "Pilates", "Home Visits", "Teleconsultation"];

/* Bright crossing marquee that "opens" on scroll — the two tilted bands grow
   out from the centre as they enter view, then scroll continuously. */
export default function CrossMarquee() {
  const ref = useRef(null);
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.set(".xrow-a", { scaleX: 0, rotation: -2.6, autoAlpha: 0 });
      gsap.set(".xrow-b", { scaleX: 0, rotation: 2.6, autoAlpha: 0 });
      gsap.to(".xrow-a", { scaleX: 1, autoAlpha: 1, duration: 1.1, ease: "power3.out",
        scrollTrigger: { trigger: ref.current, start: "top 85%", once: true } });
      gsap.to(".xrow-b", { scaleX: 1, autoAlpha: 1, duration: 1.1, ease: "power3.out", delay: 0.14,
        scrollTrigger: { trigger: ref.current, start: "top 85%", once: true } });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <div className="xmarquee" ref={ref}>
      <div className="xrow xrow-a"><div className="xtrack xtrack-l">{[...A, ...A, ...A].map((t, i) => <span key={i}>{t}</span>)}</div></div>
      <div className="xrow xrow-b"><div className="xtrack xtrack-r">{[...B, ...B, ...B].map((t, i) => <span key={i}>{t}</span>)}</div></div>
    </div>
  );
}
