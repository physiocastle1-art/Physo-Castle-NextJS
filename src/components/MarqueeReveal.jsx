"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const A = ["Orthopaedic Rehab", "Neurological Rehab", "Cardiorespiratory", "Women's Health"];
const B = ["Stress Management", "Fitness & Yoga", "Pilates", "Home Visits", "Teleconsultation"];

/* Two crossing marquee bands act as curtains over a webp frame sequence.
   On scroll they split open (top band up, bottom band down), revealing the
   frames which scrub through. Pins an inner section (stable wrapper root). */
export default function MarqueeReveal() {
  const root = useRef(null);
  const pinRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = pinRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;
    const ctx2d = canvas.getContext("2d");

    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const dir = isMobile ? "/seq-m" : "/seq";
    const COUNT = isMobile ? 63 : 127;
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);

    const images = [];
    let cw = 0, ch = 0, current = 0;
    for (let i = 1; i <= COUNT; i++) {
      const im = new Image();
      im.src = `${dir}/${String(i).padStart(3, "0")}.webp`;
      im.onload = () => { if (i === 1) draw(0); };
      images.push(im);
    }
    function resize() {
      const r = el.getBoundingClientRect();
      cw = r.width; ch = r.height;
      canvas.width = Math.floor(cw * dpr); canvas.height = Math.floor(ch * dpr);
      canvas.style.width = cw + "px"; canvas.style.height = ch + "px";
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(current);
    }
    function draw(i) {
      const im = images[i]; current = i;
      if (!im || !im.complete || !im.naturalWidth) return;
      const ir = im.naturalWidth / im.naturalHeight, cr = cw / ch;
      let dw, dh, dx, dy;
      if (cr > ir) { dw = cw; dh = cw / ir; dx = 0; dy = (ch - dh) / 2; }
      else { dh = ch; dw = ch * ir; dy = 0; dx = (cw - dw) / 2; }
      ctx2d.clearRect(0, 0, cw, ch);
      ctx2d.drawImage(im, dx, dy, dw, dh);
    }
    resize();
    window.addEventListener("resize", resize);

    const ctx = gsap.context(() => {
      gsap.set(".mr-band-a", { yPercent: 0, rotation: -2.6 });
      gsap.set(".mr-band-b", { yPercent: 0, rotation: 2.6 });
      gsap.set(".mr-title", { autoAlpha: 0, scale: 1.06 });
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el, start: "top top",
          end: `+=${isMobile ? window.innerHeight * 1.8 : window.innerHeight * 3.2}`,
          pin: true, pinSpacing: true, scrub: 1,
          onUpdate: (self) => draw(Math.min(COUNT - 1, Math.round(self.progress * (COUNT - 1)))),
        },
      });
      tl.to(".mr-band-a", { yPercent: -112, ease: "power2.inOut", duration: 0.55 }, 0)
        .to(".mr-band-b", { yPercent: 112, ease: "power2.inOut", duration: 0.55 }, 0)
        .to(".mr-title", { autoAlpha: 1, scale: 1, ease: "power2.out", duration: 0.4 }, 0.32);
    }, root);

    return () => { window.removeEventListener("resize", resize); ctx.revert(); };
  }, []);

  return (
    <div className="mreveal-root brain-hide" ref={root}>
      <section className="mreveal" ref={pinRef}>
        <canvas className="mreveal-canvas" ref={canvasRef} />
        <h2 className="mr-title">Move Better</h2>
        <div className="mr-band mr-band-a"><div className="xtrack xtrack-l">{[...A, ...A, ...A].map((t, i) => <span key={i}>{t}</span>)}</div></div>
        <div className="mr-band mr-band-b"><div className="xtrack xtrack-r">{[...B, ...B, ...B].map((t, i) => <span key={i}>{t}</span>)}</div></div>
        <span className="mr-hint">Scroll — the curtains open</span>
      </section>
    </div>
  );
}
