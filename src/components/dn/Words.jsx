"use client";
/* ─────────────────────────────────────────────────────────────────────────
   The text motion vocabulary: copy resolves out of a blur, rising slightly,
   word by word. One vocabulary for every new homepage block.

   mode is ALWAYS, not once: a reveal starts at opacity 0, and if the spring is
   starved when the trigger fires (fast scroll, busy frame, throttled tab) a
   once-trigger would leave the copy invisible permanently. Re-triggering on the
   next entry means a missed reveal heals itself.
   ───────────────────────────────────────────────────────────────────────── */
import { useEffect, useRef } from "react";
import { Spring, prefersReducedMotion } from "@/lib/dnMotion";

const BLUR_FROM = 12;
const SOFT_SPRING = { tension: 150, friction: 30 };
const DISPLAY_SPRING = { tension: 130, friction: 24 };   // brisk — the word stagger already spreads it
const LABEL_SPRING = { tension: 220, friction: 28 };

const PRESETS = {
  eyebrow: { y: 12, blur: BLUR_FROM, stagger: 45, cfg: LABEL_SPRING },
  heading: { y: 60, blur: 20, stagger: 55, cfg: DISPLAY_SPRING },
  body: { y: 16, blur: BLUR_FROM, stagger: 26, cfg: SOFT_SPRING },
};

/* Split into words, preserving inline tags: an <em> inside a heading comes back
   as <span class="dn-word"><em>word</em></span>, so `h2.title em` still styles it. */
function tokenise(node) {
  const out = [];
  node.childNodes.forEach((kid) => {
    if (kid.nodeType === 3) {
      kid.textContent.split(/\s+/).filter(Boolean).forEach((t) => out.push(document.createTextNode(t)));
    } else if (kid.nodeType === 1) {
      tokenise(kid).forEach((inner) => {
        const wrap = kid.cloneNode(false);
        wrap.appendChild(inner);
        out.push(wrap);
      });
    }
  });
  return out;
}

function splitWords(el) {
  const tokens = tokenise(el);
  el.textContent = "";
  return tokens.map((t) => {
    const w = document.createElement("span");
    w.className = "dn-word";
    w.appendChild(t);
    el.appendChild(w);
    return w;
  });
}

export function Words({
  as: Tag = "p",
  preset = "body",
  delay = 0,
  center = false,
  className = "",
  children,
  ...rest
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const p = PRESETS[preset] || PRESETS.body;

    // idempotent: a second effect pass (React StrictMode) reuses existing words
    let words = Array.from(el.querySelectorAll(":scope > .dn-word"));
    if (!words.length) words = splitWords(el);

    if (prefersReducedMotion()) {
      words.forEach((w) => { w.style.opacity = "1"; w.style.filter = "none"; w.style.transform = "none"; });
      return;
    }

    const timers = [];
    const springs = words.map((w) =>
      new Spring(0, p.cfg, (v) => {
        w.style.transform = `translate3d(0,${((1 - v) * p.y).toFixed(3)}px,0)`;
        w.style.opacity = v.toFixed(4);
        w.style.filter = `blur(${((1 - v) * p.blur).toFixed(3)}px)`;
      })
    );
    springs.forEach((s) => s.jump(0));

    let played = false;
    const play = () => {
      if (played) return;
      played = true;
      springs.forEach((s, i) => timers.push(setTimeout(() => s.set(1), delay + i * p.stagger)));
    };
    const reset = () => {
      played = false;
      timers.splice(0).forEach(clearTimeout);
      springs.forEach((s) => s.jump(0));
    };

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => (e.isIntersecting ? play() : reset())),
      { threshold: 0.12, rootMargin: "0px 0px -5% 0px" }
    );
    io.observe(el);

    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
      springs.forEach((s) => s.stop());
    };
  }, [preset, delay]);

  return (
    <Tag ref={ref} className={`dn-split${center ? " is-center" : ""}${className ? " " + className : ""}`} {...rest}>
      {children}
    </Tag>
  );
}

/** Whole-element reveal — 1.25rem rise out of a blur. */
export function RevealEl({ as: Tag = "div", delay = 0, className = "", children, ...rest }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) { el.style.opacity = "1"; el.style.filter = "none"; el.style.transform = "none"; return; }

    let timer = null;
    const spring = new Spring(0, SOFT_SPRING, (v) => {
      el.style.transform = `translate3d(0,${((1 - v) * 1.25).toFixed(4)}rem,0)`;
      el.style.opacity = v.toFixed(4);
      el.style.filter = `blur(${((1 - v) * BLUR_FROM).toFixed(3)}px)`;
    });
    spring.jump(0);

    let played = false;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            if (played) return;
            played = true;
            timer = setTimeout(() => spring.set(1), delay);
          } else {
            played = false;
            clearTimeout(timer);
            spring.jump(0);
          }
        }),
      { threshold: 0.12, rootMargin: "0px 0px -5% 0px" }
    );
    io.observe(el);

    return () => { io.disconnect(); clearTimeout(timer); spring.stop(); };
  }, [delay]);

  return (
    <Tag ref={ref} className={`dn-reveal-el${className ? " " + className : ""}`} {...rest}>
      {children}
    </Tag>
  );
}
