"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/* Scroll-scrubbed webp frame sequence (extracted from VIDEO.mp4) with
   physiotherapy text that reveals step-by-step. Mobile uses a lighter frame
   set and a shorter scroll so it won't crash. */
const STEPS = [
  ["Move better.", "Personalised, evidence-based physiotherapy led by Dr. Riddhi Shah."],
  ["Heal deeper.", "We treat the true root cause — never just the symptom."],
  ["Live fuller.", "Recovery designed around your body, your goals, your life."],
];

export default function ScrollSequence() {
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const stepsRef = useRef([]);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;
    const ctx2d = canvas.getContext("2d");

    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const dir = isMobile ? "/seq-m" : "/seq";
    const COUNT = isMobile ? 63 : 127;
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);

    const images = [];
    let loaded = 0;
    for (let i = 1; i <= COUNT; i++) {
      const img = new Image();
      img.src = `${dir}/${String(i).padStart(3, "0")}.webp`;
      img.onload = () => { loaded++; if (loaded === 1) draw(0); };
      images.push(img);
    }

    let cw = 0, ch = 0;
    function resize() {
      const r = section.getBoundingClientRect();
      cw = r.width; ch = r.height;
      canvas.width = Math.floor(cw * dpr);
      canvas.height = Math.floor(ch * dpr);
      canvas.style.width = cw + "px";
      canvas.style.height = ch + "px";
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(current);
    }
    let current = 0;
    function draw(i) {
      const img = images[i];
      current = i;
      if (!img || !img.complete || !img.naturalWidth) return;
      const ir = img.naturalWidth / img.naturalHeight;
      const cr = cw / ch;
      let dw, dh, dx, dy;
      if (cr > ir) { dw = cw; dh = cw / ir; dx = 0; dy = (ch - dh) / 2; }
      else { dh = ch; dw = ch * ir; dy = 0; dx = (cw - dw) / 2; }
      ctx2d.clearRect(0, 0, cw, ch);
      ctx2d.drawImage(img, dx, dy, dw, dh);
    }
    resize();
    window.addEventListener("resize", resize);

    const endDist = isMobile ? window.innerHeight * 1.4 : window.innerHeight * 3.4;
    const setActive = (idx) => {
      stepsRef.current.forEach((el, i) => el && el.classList.toggle("active", i === idx));
    };

    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: `+=${endDist}`,
      pin: true,
      pinSpacing: true,
      scrub: isMobile ? true : 1,
      onUpdate: (self) => {
        const p = self.progress;
        const frame = Math.min(COUNT - 1, Math.round(p * (COUNT - 1)));
        draw(frame);
        const idx = Math.min(STEPS.length - 1, Math.floor(p * STEPS.length));
        setActive(idx);
      },
    });
    setActive(0);

    return () => { st && st.kill(); window.removeEventListener("resize", resize); images.length = 0; };
  }, []);

  return (
    <section className="seq" ref={sectionRef}>
      <canvas className="seq-canvas" ref={canvasRef} />
      <div className="seq-grad" />
      <div className="seq-overlay">
        <span className="seq-kicker">How we work — Book · Assess · Treat · Recover</span>
        <div className="seq-steps">
          {STEPS.map(([title, text], i) => (
            <div className="seq-step" key={title} ref={(el) => (stepsRef.current[i] = el)}>
              <span className="seq-num">0{i + 1} / 03</span>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
