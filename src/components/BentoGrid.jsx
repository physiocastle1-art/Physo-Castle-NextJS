"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/* =====================================================================
   Physio Castle — feature bento (Aceternity-style).
   Each cell carries a small, self-contained looping illustration above
   its title + copy: a recovery chat, live progress bars, a floating care
   team, a scrolling exercise plan, a tele-consult call and a reminders
   calendar. GSAP drives the sequenced loops; ambient bits are pure CSS.
   ===================================================================== */
export default function BentoGrid() {
  const rootRef = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const $ = (s) => Array.from(root.querySelectorAll(s));

    const ctx = gsap.context(() => {
      // Cards rise in as the grid scrolls into view.
      gsap.from(root.querySelectorAll(".bento-card"), {
        y: 40, opacity: 0, duration: 0.9, ease: "power3.out",
        stagger: { each: 0.09, grid: "auto", from: "start" },
        scrollTrigger: { trigger: root, start: "top 80%" },
      });

      if (reduce) {
        // Reveal everything in its resting state, skip the loops.
        gsap.set(".b-msg, .b-cal-chip", { opacity: 1, y: 0, scale: 1 });
        $(".b-bar").forEach((b) => {
          const f = b.querySelector("i"); f.style.width = f.dataset.w + "%";
          b.querySelector("b").textContent = f.dataset.w + "%";
        });
        return;
      }

      // 1 — Recovery chat: bubbles pop in, hold, clear, repeat.
      const msgs = $(".b-msg");
      if (msgs.length) {
        gsap.set(msgs, { opacity: 0, y: 14, scale: 0.95 });
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.1 });
        msgs.forEach((m, i) => tl.to(m, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(1.6)" }, i * 0.85));
        tl.to(msgs, { opacity: 0, y: -10, duration: 0.45, stagger: 0.05 }, "+=1.6");
      }

      // 2 — Progress bars: fill up and ease back, numbers ticking along.
      $(".b-bar").forEach((bar, i) => {
        const fill = bar.querySelector("i");
        const num = bar.querySelector("b");
        const o = { v: 0 };
        gsap.to(o, {
          v: +fill.dataset.w, duration: 1.4, delay: 0.3 + i * 0.18, ease: "power2.out",
          repeat: -1, repeatDelay: 2.8, yoyo: true,
          onUpdate: () => { fill.style.width = o.v + "%"; num.textContent = Math.round(o.v) + "%"; },
        });
      });

      // 5 — Tele-consult: the "speaking" highlight hops between tiles.
      const tiles = $(".b-tile");
      if (tiles.length) {
        const tl = gsap.timeline({ repeat: -1 });
        tiles.forEach((t, i) => tl.add(() => {
          tiles.forEach((x) => x.classList.remove("speaking"));
          t.classList.add("speaking");
        }, i * 1.1));
        tl.to({}, { duration: 1.1 });
      }

      // 6 — Reminders calendar: chips drop in one by one, then reset.
      const chips = $(".b-cal-chip");
      if (chips.length) {
        gsap.set(chips, { opacity: 0, scale: 0.8, y: 10 });
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.5 });
        chips.forEach((c, i) => tl.to(c, { opacity: 1, scale: 1, y: 0, duration: 0.45, ease: "back.out(1.7)" }, i * 0.55));
        tl.to(chips, { opacity: 0, duration: 0.4 }, "+=1.5");
      }
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section className="section tight bento-zone">
      <div className="wrap">
        <div className="sec-head">
          <span className="eyebrow">Why Physio Castle</span>
          <h2 className="title">Recovery, <em>reimagined</em>.</h2>
          <p className="lede">Everything that keeps you moving forward — guided, measured and built around your life.</p>
        </div>

        <div className="bento bento-feat" ref={rootRef}>
          {/* 1 — Recovery check-ins (chat) */}
          <article className="bento-card">
            <div className="bento-anim b-chat">
              <div className="b-msg in"><span className="b-ava g1" /><p>How&apos;s the knee feeling today?</p></div>
              <div className="b-msg out"><p>Much better — finished all my exercises 💪</p><span className="b-ava g2" /></div>
              <div className="b-msg in"><span className="b-ava g1" /><p>Perfect. Let&apos;s add 5 reps tomorrow.</p></div>
            </div>
            <div className="bento-text">
              <h3>Recovery check-ins</h3>
              <p>Message your therapist between sessions and stay on track — no momentum lost.</p>
            </div>
          </article>

          {/* 7 — Interactive body / symptom map → symptom check page */}
          <Link href="/symptoms" className="bento-card bento-body-card span-2-rows bento-link">
            <div className="bento-anim b-body-showcase">
              <div className="b-body-glow" />
              <svg className="b-body-svg" viewBox="0 0 100 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M50 10a11 11 0 0 1 11 11 11 11 0 0 1-3 7.5c4 2 7 5.5 8 10l5 24c.8 4-1 6-3.5 6.2-2.3.2-3.7-1.4-4.4-4l-3-13-1 24 3 40c.5 5-1.4 7-4.2 7s-4.4-2-5-6l-3-34h-2l-3 34c-.6 4-2.2 6-5 6s-4.7-2-4.2-7l3-40-1-24-3 13c-.7 2.6-2.1 4.2-4.4 4-2.5-.2-4.3-2.2-3.5-6.2l5-24c1-4.5 4-8 8-10a11 11 0 0 1-3-7.5A11 11 0 0 1 50 10Z" fill="currentColor" opacity="0.14" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1" />
                <circle className="b-body-dot d1" cx="50" cy="33" r="3" />
                <circle className="b-body-dot d2" cx="36" cy="52" r="3" />
                <circle className="b-body-dot d3" cx="50" cy="70" r="3" />
                <circle className="b-body-dot d4" cx="41" cy="118" r="3" />
                <circle className="b-body-dot d5" cx="59" cy="160" r="3" />
              </svg>
              <div className="b-body-hud">
                <span className="hud-line">TAP A ZONE</span>
                <span className="hud-line text-right">GET GUIDANCE</span>
              </div>
            </div>
            <div className="bento-text">
              <h3>Point to your pain</h3>
              <p>Tap where it hurts on our interactive body map and get instant guidance on the care that fits.</p>
              <span className="bento-cta">Check my symptoms <span className="arw">→</span></span>
            </div>
          </Link>

          {/* 2 — Progress tracking (bars) */}
          <article className="bento-card">
            <div className="bento-anim b-bars">
              <div className="b-bar"><span>Mobility</span><div className="b-track"><i data-w="88" /></div><b>0%</b></div>
              <div className="b-bar"><span>Strength</span><div className="b-track"><i data-w="74" /></div><b>0%</b></div>
              <div className="b-bar"><span>Pain-free days</span><div className="b-track"><i data-w="92" /></div><b>0%</b></div>
            </div>
            <div className="bento-text">
              <h3>Track your progress</h3>
              <p>Watch mobility, strength and comfort climb week over week against real goals.</p>
            </div>
          </article>

          {/* 4 — Personalised plan (scrolling list) */}
          <article className="bento-card span-2-rows">
            <div className="bento-anim b-plan">
              <div className="b-plan-track">
                {[
                  ["Glute bridges", "3 × 12"], ["Heel slides", "3 × 15"], ["Wall sits", "4 × 30s"],
                  ["Calf raises", "3 × 20"], ["Hamstring stretch", "2 × 40s"], ["Step-ups", "3 × 12"],
                ].concat([
                  ["Glute bridges", "3 × 12"], ["Heel slides", "3 × 15"], ["Wall sits", "4 × 30s"],
                  ["Calf raises", "3 × 20"], ["Hamstring stretch", "2 × 40s"], ["Step-ups", "3 × 12"],
                ]).map(([n, s], i) => (
                  <div className="b-ex" key={i}><span className="b-ex-dot" /><b>{n}</b><i>{s}</i></div>
                ))}
              </div>
            </div>
            <div className="bento-text">
              <h3>Plans made for you</h3>
              <p>Every exercise is matched to your body, goals and routine — never a template.</p>
            </div>
          </article>

          {/* 3 — Care team (floating avatars) */}
          <article className="bento-card">
            <div className="bento-anim b-team">
              <span className="b-ava big center g3" />
              <span className="b-ava float f1 g1" />
              <span className="b-ava float f2 g2" />
              <span className="b-ava float f3 g4" />
              <span className="b-ava float f4 g5" />
              <span className="b-ava float f5 g2" />
              <span className="b-ava float f6 g1" />
            </div>
            <div className="bento-text">
              <h3>Your expert care team</h3>
              <p>Licensed specialists across ortho, neuro, women&apos;s health and sports — all in your corner.</p>
            </div>
          </article>

          {/* 5 — Clinic or home / tele-consult (video tiles) */}
          <article className="bento-card">
            <div className="bento-anim b-call">
              <div className="b-tile"><span className="b-ava g2" /><i className="b-mic" /></div>
              <div className="b-tile"><span className="b-ava g4" /><i className="b-mic off" /></div>
              <div className="b-tile"><span className="b-ava g1" /><i className="b-mic" /></div>
              <div className="b-tile"><span className="b-ava g5" /><i className="b-mic off" /></div>
            </div>
            <div className="bento-text">
              <h3>Clinic or home visits</h3>
              <p>Can&apos;t make it in? Get the same expert care over a secure video consult or at your door.</p>
            </div>
          </article>

          {/* 6 — Smart reminders (calendar chips) */}
          <article className="bento-card">
            <div className="bento-anim b-cal">
              <div className="b-cal-grid">
                {Array.from({ length: 21 }).map((_, i) => <span key={i} className={`b-cal-day${i === 9 ? " on" : ""}`} />)}
              </div>
              <div className="b-cal-chips">
                <span className="b-cal-chip">Physio · 4:00 PM</span>
                <span className="b-cal-chip alt">Knee exercises</span>
                <span className="b-cal-chip">Follow-up review</span>
              </div>
            </div>
            <div className="bento-text">
              <h3>Smart reminders</h3>
              <p>Automated session and exercise nudges keep you consistent — without the mental load.</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
