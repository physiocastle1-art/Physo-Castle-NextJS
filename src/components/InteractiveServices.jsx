"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import gsap from "gsap";

const SERVICES = [
  {
    num: "01",
    id: "ortho",
    title: "Orthopaedic Rehabilitation",
    tagline: "Recover strength, mobility & confidence",
    description: "Personalised, hands-on physical therapy for bone, joint, ligament and post-surgical recovery. We target the root cause of movement restriction to eliminate pain and restore athletic and daily function.",
    conds: ["Post-surgical / fracture", "Low back pain", "Neck pain", "Shoulder pain", "Elbow pain", "Wrist pain", "Hip pain", "Knee pain", "Ankle pain"],
    price: "₹800 / session",
    pkg: "₹3,500 / 5 sessions",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="isvc-svg">
        <circle cx="7" cy="7" r="3" />
        <circle cx="17" cy="17" r="3" />
        <path d="M9.1 9.1l5.8 5.8" />
      </svg>
    ),
  },
  {
    num: "02",
    id: "neuro",
    title: "Neurological Rehabilitation",
    tagline: "Rebuilding neural pathways & motor control",
    description: "Evidence-based neuro-rehabilitation designed to retrain balance, gait, motor control and independence following stroke, spinal injury, or neurological conditions.",
    conds: ["Post-stroke recovery", "Parkinson's disease", "Traumatic brain injuries", "Nerve injuries & neuropathy", "Balance & gait retraining"],
    price: "₹1,000 / session",
    pkg: "₹4,500 / 5 sessions",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="isvc-svg">
        <circle cx="12" cy="5.5" r="2" />
        <circle cx="6" cy="13" r="2" />
        <circle cx="18" cy="13" r="2" />
        <circle cx="12" cy="19.5" r="1.8" />
        <path d="M12 7.5l-4.8 4M12 7.5l4.8 4M7.5 14.5l3.8 3.5M16.5 14.5l-3.8 3.5" />
      </svg>
    ),
  },
  {
    num: "03",
    id: "cardio",
    title: "Cardiorespiratory Rehabilitation",
    tagline: "Breathe easier & restore stamina",
    description: "Supervised chest physiotherapy, lung expansion protocols and progressive aerobic conditioning to restore breath endurance after cardiac surgery, illness, or respiratory conditions.",
    conds: ["Post-CABG cardiac surgery", "Post-COVID recovery", "Hypertension & endurance", "Bronchitis & Asthma", "Pneumonia rehabilitation"],
    price: "₹800 / session",
    pkg: "₹3,500 / 5 sessions",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="isvc-svg">
        <path d="M3 12h4l2-5 3 10 2-5h7" />
      </svg>
    ),
  },
  {
    num: "04",
    id: "women",
    title: "Women's Health Rehabilitation",
    tagline: "Specialised care for every stage of life",
    description: "Private, compassionate physical therapy addressing pelvic health, pre & post-natal recovery, menstrual discomfort, and menopausal musculoskeletal wellness.",
    conds: ["Pre-natal & Post-natal care", "PCOS & Menstrual pain relief", "Pelvic floor strengthening", "Diastasis recti recovery", "Menopausal joint care"],
    price: "₹800 / session",
    pkg: "₹3,500 / 5 sessions",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="isvc-svg">
        <circle cx="12" cy="8" r="4" />
        <path d="M12 12v8M9 16h6" />
      </svg>
    ),
  },
  {
    num: "05",
    id: "stress",
    title: "Stress & Nervous System Management",
    tagline: "Settle tension & restore physiological calm",
    description: "Therapeutic relaxation protocols, diaphragmatic breathwork, and autonomic nervous system regulation to alleviate chronic stress, tension headaches, and muscle tightness.",
    conds: ["Relaxation therapy", "Diaphragmatic breathwork", "Tension headache relief", "Autonomic nervous system reset", "Postural stress reduction"],
    price: "₹700 / session",
    pkg: "₹3,000 / 5 sessions",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="isvc-svg">
        <path d="M4 8c4-3 12-3 16 0M4 13c4-3 12-3 16 0M4 18c4-3 12-3 16 0" />
      </svg>
    ),
  },
  {
    num: "06",
    id: "fitness",
    title: "Fitness & Weight Management",
    tagline: "Physio-guided medical fitness",
    description: "Medically supervised conditioning and safe weight management programmes built around joint protection, sustainable strength, and injury prevention.",
    conds: ["Joint-safe strength training", "Medical weight management", "Post-rehab athletic conditioning", "Ergonomic body composition"],
    price: "₹800 / session",
    pkg: "₹3,500 / 5 sessions",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="isvc-svg">
        <path d="M4 10v4M7 7v10M17 7v10M20 10v4M7 12h10" />
      </svg>
    ),
  },
  {
    num: "07",
    id: "yoga",
    title: "Yoga · Zumba · Pilates",
    tagline: "Therapeutic group & 1-on-1 movement",
    description: "Mindful movement classes that blend clinical biomechanics with dynamic group energy — developing core stability, flexibility, posture, and joy.",
    conds: ["Clinical Yoga", "Therapeutic Pilates", "Zumba Fitness", "Core stabilization", "Group & 1-on-1 sessions"],
    price: "₹600 / session",
    pkg: "₹2,500 / 5 sessions",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="isvc-svg">
        <circle cx="12" cy="5" r="2" />
        <path d="M12 7v6M5 18l7-5 7 5M8 11.5h8" />
      </svg>
    ),
  },
];

export default function InteractiveServices() {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    // GSAP subtle entrance animation with full property cleanup
    const ctx = gsap.context(() => {
      gsap.from(".isvc-item", {
        opacity: 0,
        y: 24,
        duration: 0.6,
        stagger: 0.06,
        ease: "power2.out",
        onComplete: () => {
          gsap.set(".isvc-item", { clearProps: "opacity,transform" });
        },
      });
    });
    return () => ctx.revert();
  }, []);

  const toggle = (idx) => {
    setActiveIdx(activeIdx === idx ? -1 : idx);
  };

  return (
    <section className="isvc-section">
      <div className="wrap">
        <div className="isvc-header">
          <span className="eyebrow"><Link href="/">Home</Link> / Services</span>
          <h2 className="isvc-heading">
            Specialised <em>Rehabilitation</em> &amp; Care
          </h2>
          <p className="isvc-sub">
            Interactive suite — tap any programme to explore clinical focus, conditions treated, and package rates.
          </p>
        </div>

        <div className="isvc-list">
          {SERVICES.map((s, i) => {
            const isOpen = activeIdx === i;
            return (
              <div
                key={s.num}
                className={`isvc-item ${isOpen ? "open" : ""}`}
              >
                <button
                  type="button"
                  className="isvc-bar"
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen}
                >
                  <span className="isvc-num">{s.num}</span>
                  <div className="isvc-ico-wrap">{s.icon}</div>

                  <div className="isvc-titles">
                    <h3 className="isvc-title">{s.title}</h3>
                    <span className="isvc-tagline">{s.tagline}</span>
                  </div>

                  <div className="isvc-meta-side">
                    <span className="isvc-badge">{s.conds.length} Conditions</span>
                    <span className="isvc-toggle-btn">{isOpen ? "−" : "+"}</span>
                  </div>
                </button>

                {isOpen ? (
                  <div className="isvc-panel">
                    <div className="isvc-panel-inner">
                      <div className="isvc-grid">
                        <div className="isvc-left">
                          <p className="isvc-desc">{s.description}</p>

                          <div className="isvc-pricing">
                            <div className="isvc-price-tag">
                              <span>Single Visit</span>
                              <strong>{s.price}</strong>
                            </div>
                            <div className="isvc-price-tag gold">
                              <span>5-Session Rehab Package</span>
                              <strong>{s.pkg}</strong>
                            </div>
                          </div>

                          <div className="isvc-actions">
                            <Link href="/contact" className="btn btn-gold">
                              Book This Service <span className="arw">→</span>
                            </Link>
                          </div>
                        </div>

                        <div className="isvc-right">
                          <span className="isvc-cond-head">Conditions &amp; Focus Areas:</span>
                          <div className="isvc-chips">
                            {s.conds.map((c) => (
                              <span key={c} className="isvc-chip">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .isvc-section {
          padding: 50px 0 80px;
          background: var(--bg, #f4eee2);
        }
        .isvc-header {
          margin-bottom: 36px;
        }
        .isvc-heading {
          font-family: var(--serif);
          font-size: clamp(2.2rem, 5vw, 4.2rem);
          font-weight: 300;
          line-height: 1.05;
          margin-top: 12px;
          color: var(--ink, #17231c);
        }
        .isvc-heading em {
          font-style: italic;
          color: var(--gold, #2a523b);
        }
        .isvc-sub {
          font-size: clamp(0.92rem, 1.4vw, 1.15rem);
          color: var(--muted, #5b6675);
          margin-top: 14px;
          max-width: 60ch;
        }

        .isvc-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .isvc-item {
          background: #ffffff !important;
          border: 1px solid rgba(18, 33, 25, 0.14) !important;
          border-radius: 18px;
          overflow: hidden;
          opacity: 1 !important;
          transition: border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
        }

        .isvc-item:hover {
          border-color: var(--gold, #2a523b) !important;
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(42, 82, 59, 0.12);
        }

        .isvc-item.open {
          border-color: var(--gold, #2a523b) !important;
          background: #ffffff !important;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.08);
        }

        .isvc-bar {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 22px 28px;
          background: #ffffff;
          border: none;
          cursor: pointer;
          text-align: left;
          color: #17231c !important;
        }

        .isvc-num {
          font-family: var(--serif);
          font-size: 1.4rem;
          color: var(--gold, #2a523b) !important;
          font-weight: 600;
          opacity: 1 !important;
          width: 32px;
          flex-shrink: 0;
        }

        .isvc-ico-wrap {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(42, 82, 59, 0.06);
          border: 1px solid rgba(42, 82, 59, 0.16);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--gold, #2a523b);
          flex-shrink: 0;
          transition: transform 0.3s ease;
        }

        .isvc-item:hover .isvc-ico-wrap {
          transform: scale(1.08) rotate(4deg);
          background: rgba(42, 82, 59, 0.12);
        }

        .isvc-titles {
          flex: 1;
        }

        .isvc-title {
          font-family: var(--serif);
          font-size: clamp(1.15rem, 2.2vw, 1.8rem);
          font-weight: 500;
          color: #17231c !important;
          opacity: 1 !important;
          margin: 0;
          transition: color 0.3s ease;
        }

        .isvc-item.open .isvc-title,
        .isvc-item:hover .isvc-title {
          color: var(--gold, #2a523b) !important;
        }

        .isvc-tagline {
          font-size: 0.86rem;
          color: #4a5568 !important;
          opacity: 1 !important;
          display: block;
          margin-top: 2px;
        }

        .isvc-meta-side {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .isvc-badge {
          font-size: 0.78rem;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 100px;
          background: rgba(42, 82, 59, 0.08);
          color: var(--gold, #2a523b) !important;
          letter-spacing: 0.04em;
        }

        .isvc-toggle-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid rgba(18, 33, 25, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
          font-weight: 600;
          color: #17231c !important;
          transition: all 0.3s ease;
          flex-shrink: 0;
        }

        .isvc-item.open .isvc-toggle-btn {
          background: var(--gold, #2a523b);
          color: #ffffff !important;
          border-color: var(--gold, #2a523b);
        }

        .isvc-panel {
          border-top: 1px solid rgba(18, 33, 25, 0.1);
          animation: isvcSlideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes isvcSlideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .isvc-panel-inner {
          padding: 28px;
          background: linear-gradient(180deg, #faf6ee 0%, #ffffff 100%);
        }

        .isvc-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 32px;
        }

        .isvc-desc {
          font-size: 0.96rem;
          line-height: 1.6;
          color: #17231c !important;
          margin-bottom: 20px;
        }

        .isvc-pricing {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .isvc-price-tag {
          padding: 12px 18px;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid rgba(18, 33, 25, 0.12);
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-width: 140px;
        }

        .isvc-price-tag.gold {
          background: rgba(42, 82, 59, 0.08);
          border-color: var(--gold, #2a523b);
        }

        .isvc-price-tag span {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #5b6675 !important;
          font-weight: 600;
        }

        .isvc-price-tag strong {
          font-size: 1.1rem;
          color: var(--gold, #2a523b) !important;
          font-family: var(--serif);
        }

        .isvc-actions .btn {
          width: 100%;
          justify-content: center;
        }

        .isvc-cond-head {
          display: block;
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #5b6675 !important;
          margin-bottom: 12px;
          font-weight: 600;
        }

        .isvc-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .isvc-chip {
          padding: 7px 14px;
          border-radius: 100px;
          background: #ffffff;
          border: 1px solid rgba(18, 33, 25, 0.14);
          font-size: 0.82rem;
          font-weight: 500;
          color: #17231c !important;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
          transition: all 0.2s ease;
        }

        .isvc-chip:hover {
          border-color: var(--gold, #2a523b);
          color: var(--gold, #2a523b) !important;
        }

        /* Mobile Adjustments (< 768px) */
        @media (max-width: 768px) {
          .isvc-section {
            padding: 36px 0 60px;
          }
          .isvc-bar {
            padding: 16px;
            gap: 12px;
          }
          .isvc-num {
            font-size: 1.1rem;
            width: 24px;
          }
          .isvc-ico-wrap {
            width: 36px;
            height: 36px;
            border-radius: 8px;
          }
          .isvc-ico-wrap svg {
            width: 20px;
            height: 20px;
          }
          .isvc-title {
            font-size: 1.1rem;
          }
          .isvc-tagline {
            font-size: 0.78rem;
          }
          .isvc-badge {
            display: none;
          }
          .isvc-toggle-btn {
            width: 32px;
            height: 32px;
            font-size: 1.1rem;
          }
          .isvc-panel-inner {
            padding: 20px 16px;
          }
          .isvc-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .isvc-pricing {
            flex-direction: column;
            gap: 10px;
          }
          .isvc-price-tag {
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
}
