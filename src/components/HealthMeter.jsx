"use client";
import { useEffect, useRef, useState } from "react";

const ROWS = [
  ["Mobility & Flexibility", "Optimal", 86],
  ["Strength & Stability", "Strong", 78],
  ["Posture & Alignment", "Improving", 64],
  ["Cardio-Respiratory Fitness", "Good", 72],
  ["Pain & Recovery Balance", "Restoring", 68],
  ["Stress & Relaxation", "Calm", 80],
];

export default function HealthMeter() {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.unobserve(el); } }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div className="meter-wrap" ref={ref} style={{ maxWidth: 880, margin: "0 auto" }}>
      {ROWS.map(([label, tag, val]) => (
        <div className="meter-row" key={label}>
          <div className="lbl"><b>{label}</b><span>{tag}</span></div>
          <div className="meter-track"><div className="meter-fill" style={{ width: on ? val + "%" : 0 }} /></div>
        </div>
      ))}
    </div>
  );
}
