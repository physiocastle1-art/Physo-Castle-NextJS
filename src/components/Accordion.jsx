"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function Accordion({ items }) {
  const [open, setOpen] = useState(-1);
  const ref = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.utils.toArray(".acc").forEach((el, i) => {
        gsap.from(el, {
          x: i % 2 === 0 ? -90 : 90,
          autoAlpha: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <div className="faq" ref={ref}>
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div className={"acc" + (isOpen ? " open" : "")} key={i}>
            <button className="acc-q" onClick={() => setOpen(isOpen ? -1 : i)}>
              {it.q}<span className="pm">+</span>
            </button>
            <AccBody open={isOpen}>{it.a}</AccBody>
          </div>
        );
      })}
    </div>
  );
}

function AccBody({ open, children }) {
  const ref = useRef(null);
  return (
    <div className="acc-a" style={{ maxHeight: open ? (ref.current ? ref.current.scrollHeight + 40 : 600) : 0 }}>
      <p ref={ref}>{children}</p>
    </div>
  );
}
