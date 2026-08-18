"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";

/* CODE-GRID landing-style hero: huge uppercase headline that reveals
   word-by-word on load (masked rise, "glide" ease). */
export default function HeroReveal({ text, className = "", delay = 0.25 }) {
  const ref = useRef(null);
  useEffect(() => {
    gsap.registerPlugin(SplitText, CustomEase);
    CustomEase.create("glide", "0.8, 0, 0.2, 1");
    let split;
    const ctx = gsap.context(() => {
      split = SplitText.create(ref.current, { type: "words", wordsClass: "hr-word", mask: "words" });
      gsap.set(split.words, { y: "115%" });
      gsap.to(split.words, { y: "0%", duration: 1.1, ease: "glide", stagger: 0.06, delay });
    }, ref);
    return () => {
      split && split.revert && split.revert();
      ctx.revert();
    };
  }, [delay]);
  return <h1 className={className} ref={ref}>{text}</h1>;
}
