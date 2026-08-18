"use client";
import { useState } from "react";
import Link from "next/link";

/* Interactive front-view body. Click a region on the figure (or pick it from the
   list below it) and the panel suggests the likely issues + the service that
   treats them. Purely informational — links the visitor onward to the matching
   service and to booking. */
const REGIONS = {
  head: {
    label: "Head",
    blurb: "Tension headaches, jaw tightness, dizziness or balance issues often trace back to the neck, nervous system or built-up stress.",
    conditions: ["Tension headaches", "Dizziness / vertigo", "Post-stroke recovery", "Jaw (TMJ) tension"],
    service: "Neuro Rehab & Stress Management",
    href: "/services#svc-02",
  },
  neckshoulder: {
    label: "Neck & shoulders",
    blurb: "Stiffness, aching or pain from desk posture, sleeping awkwardly, or an old injury that never fully settled.",
    conditions: ["Neck pain", "Frozen / stiff shoulder", "Posture strain", "Tingling into the arm"],
    service: "Orthopaedic Rehabilitation",
    href: "/services#svc-01",
  },
  chest: {
    label: "Chest & breathing",
    blurb: "Breathlessness, tightness or reduced stamina after an illness, or a cardiac or respiratory condition.",
    conditions: ["Post-COVID recovery", "Breathlessness", "Post-cardiac surgery", "Asthma / bronchitis support"],
    service: "Cardiorespiratory Rehabilitation",
    href: "/services#svc-03",
  },
  back: {
    label: "Back & spine",
    blurb: "Lower or mid-back pain, stiffness or sciatica — one of the most treatable complaints in physiotherapy.",
    conditions: ["Low back pain", "Sciatica", "Disc-related pain", "Core weakness"],
    service: "Orthopaedic Rehabilitation",
    href: "/services#svc-01",
  },
  arm: {
    label: "Elbow, arm & wrist",
    blurb: "Pain, weakness or tingling from overuse, an injury or a trapped nerve.",
    conditions: ["Tennis / golfer's elbow", "Wrist pain", "Carpal tunnel", "Post-fracture recovery"],
    service: "Orthopaedic Rehabilitation",
    href: "/services#svc-01",
  },
  hip: {
    label: "Hips & pelvis",
    blurb: "Hip pain, pelvic discomfort, or women's-health concerns through every stage of life.",
    conditions: ["Hip pain", "Pre / post-natal care", "PCOS & menstrual pain", "Pelvic floor"],
    service: "Women's Health & Orthopaedic",
    href: "/services#svc-04",
  },
  knee: {
    label: "Knees",
    blurb: "Pain, swelling or instability from sport, wear-and-tear, or after surgery.",
    conditions: ["Knee pain", "Ligament / meniscus injury", "Post-surgical (ACL, replacement)", "Arthritis"],
    service: "Orthopaedic Rehabilitation",
    href: "/services#svc-01",
  },
  ankle: {
    label: "Ankles & feet",
    blurb: "Sprains, heel pain or stiffness that changes how you walk and stay active.",
    conditions: ["Ankle sprain", "Plantar fasciitis / heel pain", "Post-fracture recovery", "Balance & gait"],
    service: "Orthopaedic Rehabilitation",
    href: "/services#svc-01",
  },
};

/* Clickable zones over the figure. Each is a generous ellipse so it is easy to
   hit on touch as well as with a mouse. Order matters: limbs first so the torso
   zones win wherever the two overlap (shoulder caps, armpits). */
const ZONES = [
  { id: "arm", cx: 60, cy: 205, rx: 27, ry: 106, rot: 7 },
  { id: "arm", cx: 180, cy: 205, rx: 27, ry: 106, rot: -7 },
  { id: "head", cx: 120, cy: 45, rx: 32, ry: 38 },
  { id: "neckshoulder", cx: 120, cy: 105, rx: 60, ry: 29 },
  { id: "chest", cx: 120, cy: 160, rx: 46, ry: 32 },
  { id: "back", cx: 120, cy: 225, rx: 42, ry: 34 },
  { id: "hip", cx: 120, cy: 285, rx: 48, ry: 28 },
  { id: "knee", cx: 100, cy: 428, rx: 20, ry: 46 },
  { id: "knee", cx: 140, cy: 428, rx: 20, ry: 46 },
  { id: "ankle", cx: 103, cy: 528, rx: 17, ry: 34 },
  { id: "ankle", cx: 137, cy: 528, rx: 17, ry: 34 },
];

/* One continuous anatomical outline, mirrored exactly around x = 120 — a single
   path so there are no seams where limbs meet the torso. */
const FIGURE =
  "M120 14 C103 14 92 26 92 44 C92 60 100 70 108 76 L108 86 " +
  "C96 90 84 94 76 102 C66 108 60 118 58 132 C55 154 52 176 49 198 " +
  "C46 222 43 246 41 268 C39 288 41 304 47 308 C53 312 59 306 61 296 " +
  "C64 272 67 250 70 226 C73 202 76 178 79 154 C82 176 86 200 89 226 " +
  "C84 244 82 266 86 284 C78 316 77 348 81 376 C83 398 86 418 88 440 " +
  "C89 464 91 490 92 512 C93 528 94 538 96 544 C88 550 86 558 96 560 " +
  "L113 560 C118 560 117 550 115 542 C114 512 115 486 115 458 " +
  "C115 428 116 398 116 370 C116 340 116 314 115 292 L120 288 L125 292 " +
  "C124 314 124 340 124 370 C124 398 125 428 125 458 C125 486 126 512 125 542 " +
  "C123 550 122 560 127 560 L144 560 C154 558 152 550 144 544 " +
  "C146 538 147 528 148 512 C149 490 151 464 152 440 C154 418 157 398 159 376 " +
  "C163 348 162 316 154 284 C158 266 156 244 151 226 C154 200 158 176 161 154 " +
  "C164 178 167 202 170 226 C173 250 176 272 179 296 C181 306 187 312 193 308 " +
  "C199 304 201 288 199 268 C197 246 194 222 191 198 C188 176 185 154 182 132 " +
  "C180 118 174 108 164 102 C156 94 144 90 132 86 L132 76 " +
  "C140 70 148 60 148 44 C148 26 137 14 120 14 Z";

export default function BodyMap() {
  const [active, setActive] = useState(null);
  const [hover, setHover] = useState(null);
  const sel = active ? REGIONS[active] : null;
  const shown = hover || active;

  return (
    <div className="bodymap">
      <div className="bodymap-figure">
        <div className="bm-stage">
          <svg viewBox="0 0 240 570" role="group" aria-label="Interactive body map — select where it hurts">
            {/* --- reference grid --- */}
            <g className="bm-grid">
              <line x1="120" y1="14" x2="120" y2="556" />
              <line x1="24" y1="105" x2="216" y2="105" />
              <line x1="24" y1="285" x2="216" y2="285" />
              <line x1="24" y1="428" x2="216" y2="428" />
            </g>

            {/* --- anatomical silhouette (non-interactive) --- */}
            <g className="bm-body">
              <path d={FIGURE} />
            </g>

            {/* --- clickable zones --- */}
            <g className="bm-zones">
              {ZONES.map((z, i) => {
                const on = active === z.id || hover === z.id;
                const t = z.rot ? `rotate(${z.rot} ${z.cx} ${z.cy})` : undefined;
                return (
                  <g
                    key={z.id + i}
                    className={"bm-zone" + (on ? " on" : "") + (active === z.id ? " sel" : "")}
                    transform={t}
                    role="button"
                    tabIndex={0}
                    aria-label={REGIONS[z.id].label}
                    aria-pressed={active === z.id}
                    onClick={() => setActive(z.id)}
                    onMouseEnter={() => setHover(z.id)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(z.id)}
                    onBlur={() => setHover(null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActive(z.id); }
                    }}
                  >
                    <ellipse cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry} className="bm-zone-fill" />
                    <circle cx={z.cx} cy={z.cy} r="11" className="bm-pin-pulse" />
                    <circle cx={z.cx} cy={z.cy} r="11" className="bm-pin" />
                    <g className="bm-pin-plus">
                      <line x1={z.cx - 4} y1={z.cy} x2={z.cx + 4} y2={z.cy} />
                      <line x1={z.cx} y1={z.cy - 4} x2={z.cx} y2={z.cy + 4} />
                    </g>
                  </g>
                );
              })}
            </g>
          </svg>
          <p className="bodymap-hint" aria-hidden="true">
            {shown ? REGIONS[shown].label : "Click a marker on the body"}
          </p>
        </div>

        <div className="bm-picker">
          <span className="bm-picker-lbl">Or choose an area</span>
          <div className="bm-chips">
            {Object.entries(REGIONS).map(([id, r]) => (
              <button
                key={id}
                type="button"
                className={"bm-chip" + (active === id ? " on" : "")}
                aria-pressed={active === id}
                onClick={() => setActive(id)}
                onMouseEnter={() => setHover(id)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(id)}
                onBlur={() => setHover(null)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bodymap-panel" aria-live="polite">
        {!sel ? (
          <div className="bm-empty">
            <span className="eyebrow">Where does it hurt?</span>
            <h3>Point to your pain.</h3>
            <p>Select an area on the body — or pick one from the list — and we&apos;ll show you the common issues we treat there, plus the right next step.</p>
          </div>
        ) : (
          <div className="bm-detail" key={active}>
            <span className="eyebrow">Suggested for you</span>
            <h3>{sel.label}</h3>
            <p>{sel.blurb}</p>
            <ul className="bm-conds">
              {sel.conditions.map((c) => <li key={c}>{c}</li>)}
            </ul>
            <div className="bm-service">
              <span className="bm-service-lbl">Recommended care</span>
              <strong>{sel.service}</strong>
            </div>
            <div className="pill-row" style={{ marginTop: 22 }}>
              <Link href="/contact" className="btn btn-gold">Book an assessment <span className="arw">→</span></Link>
              <Link href={sel.href} className="btn btn-ghost">See this service</Link>
            </div>
            <button type="button" className="bm-reset" onClick={() => setActive(null)}>Choose a different area</button>
          </div>
        )}
      </div>
    </div>
  );
}
