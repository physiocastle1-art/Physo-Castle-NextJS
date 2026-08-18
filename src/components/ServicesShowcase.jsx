"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import { photo, SERVICE_PHOTOS } from "@/lib/dnImages";

const SERVICES = [
  {
    name: "Orthopaedic Rehabilitation",
    img: photo("1649751361457-01d3a696c7e6", 1200),
    heading: "Recover strength, mobility and confidence after injury or surgery — guided by hands-on therapy and progressive exercise.",
    conds: ["Post-surgical / fracture", "Low back pain", "Neck pain", "Shoulder", "Knee", "Ankle"],
  },
  {
    name: "Neurological Rehabilitation",
    img: photo(SERVICE_PHOTOS.neuro, 1200),
    heading: "Rebuilding movement, balance and independence through targeted neuro-rehabilitation and retraining.",
    conds: ["Post-stroke", "Parkinson's", "Traumatic brain injuries", "Nerve injuries"],
  },
  {
    name: "Cardiorespiratory Rehabilitation",
    img: photo("1519824145371-296894a0daa9", 1200),
    heading: "Breathe easier and rebuild endurance after illness or cardiac and respiratory conditions.",
    conds: ["Hypertension", "Post-CABG", "Respiratory issues", "Pneumonia", "Post-COVID"],
  },
  {
    name: "Women's Health",
    img: photo(SERVICE_PHOTOS.women, 1200),
    heading: "Specialised, compassionate physiotherapy for every phase of a woman's life.",
    conds: ["Menstrual pain", "PCOS", "Pre / post-natal", "Menopausal care"],
  },
  {
    name: "Stress & Wellness",
    img: photo(SERVICE_PHOTOS.stress, 1200),
    heading: "Calm the nervous system and move with joy — relaxation therapy, fitness, yoga, Zumba and Pilates.",
    conds: ["Relaxation therapy", "Breathing", "Yoga / Zumba / Pilates", "Weight loss"],
  },
];

export default function ServicesShowcase() {
  const [selected, setSelected] = useState(null);
  const detailRef = useRef(null);

  // Exact Steelworks-style reveal whenever a service detail opens.
  useEffect(() => {
    if (selected === null || !detailRef.current) return;
    gsap.registerPlugin(SplitText, CustomEase);
    CustomEase.create("hop", "0.9, 0, 0.1, 1");
    CustomEase.create("glide", "0.8, 0, 0.2, 1");
    let split;
    const ctx = gsap.context(() => {
      const el = detailRef.current;
      const img = el.querySelector(".svc-detail-img img");
      split = SplitText.create(
        el.querySelectorAll(".svc-detail-head h1, .svc-detail-meta .svc-detail-label"),
        { type: "lines", linesClass: "line", mask: "lines" }
      );
      gsap.set(el.querySelectorAll(".line"), { y: "125%" });
      gsap.set(".svc-detail-kicker", { opacity: 0, y: 20 });
      gsap.set(".svc-detail-conds", { opacity: 0, y: 20 });
      gsap.set(img, { scale: 0.5, rotation: 8, borderRadius: "2.5rem" });

      const tl = gsap.timeline({ delay: 0.1 });
      tl.to(".svc-detail-bar", {
        scaleX: 1,
        duration: 1.1,
        ease: "glide",
        onComplete: () => gsap.set(".svc-detail-bar", { transformOrigin: "right" }),
      });
      tl.to(".svc-detail-bar", { scaleX: 0, duration: 0.9, ease: "hop" });
      tl.to(
        ".svc-detail-pre",
        { clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)", duration: 0.9, ease: "hop" },
        "<0.55"
      );
      tl.to(img, { scale: 1, rotation: 0, borderRadius: 0, duration: 1.5, ease: "glide" }, "<0.05");
      tl.to(".svc-detail-kicker", { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }, "<0.5");
      tl.to(
        ".svc-detail-head .line",
        { y: "0%", duration: 1, stagger: 0.1, ease: "power3.out" },
        "<0.1"
      );
      tl.to(
        ".svc-detail-meta .line",
        { y: "0%", duration: 1, stagger: 0.07, ease: "power3.out" },
        "<0.25"
      );
      tl.to(".svc-detail-conds", { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }, "<0.15");
    }, detailRef);
    return () => {
      split && split.revert && split.revert();
      ctx.revert();
    };
  }, [selected]);

  if (selected !== null) {
    const s = SERVICES[selected];
    return (
      <section className="svc-detail" ref={detailRef}>
        <div className="svc-detail-pre">
          <div className="svc-detail-bar" />
        </div>
        <div className="svc-detail-img">
          <img src={s.img} alt={s.name} />
        </div>
        <div className="svc-detail-overlay" />
        <button className="svc-back" onClick={() => setSelected(null)}>
          <span>←</span> Back to all
        </button>
        <div className="svc-detail-content">
          <div className="svc-detail-head">
            <span className="svc-detail-kicker">Physio Castle / {s.name}</span>
            <h1>{s.heading}</h1>
          </div>
          <div className="svc-detail-meta">
            <p className="svc-detail-label">Conditions we treat</p>
            <div className="svc-detail-conds">
              {s.conds.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  const loop = [...SERVICES, ...SERVICES];
  return (
    <section className="svc-marquee-wrap">
      <div className="svc-marquee-head">
        <span className="eyebrow">Our services</span>
        <h2 className="title">
          Explore the <em>care</em>.
        </h2>
        <p className="lede">A moving showcase — click any service to open it in full.</p>
      </div>
      <div className="svc-marquee">
        <div className="svc-marquee-track">
          {loop.map((s, i) => (
            <button
              className="svc-mq"
              key={i}
              onClick={() => setSelected(i % SERVICES.length)}
              aria-label={s.name}
            >
              <img src={s.img} alt={s.name} />
              <span className="svc-mq-label">
                {s.name}
                <i>↗</i>
              </span>
            </button>
          ))}
        </div>
      </div>
      <p className="svc-marquee-hint">Click any service to explore →</p>
    </section>
  );
}
