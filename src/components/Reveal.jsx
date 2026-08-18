"use client";
import { useEffect, useRef, useState } from "react";

export default function Reveal({ children, delay = 0, className = "", as = "div", style, id }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  const Tag = as;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.unobserve(el); } },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const d = delay ? ` d${delay}` : "";
  return (
    <Tag ref={ref} id={id} className={`reveal${d}${shown ? " in" : ""} ${className}`} style={style}>
      {children}
    </Tag>
  );
}
