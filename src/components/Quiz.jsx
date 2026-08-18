"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

/* Self-Assessment Questionnaire — 15 yes/no questions, Yes = 1, No = 0.
   Total is scored out of 15 and mapped to one of four guidance bands. */
const QUESTIONS = [
  "Have you had pain lasting more than 7 days?",
  "Does pain interfere with your work, studies, or household activities?",
  "Have you stopped exercising or playing sports because of pain?",
  "Do you have difficulty walking, climbing stairs, or standing up from a chair?",
  "Is it difficult to lift your arm overhead or reach behind your back?",
  "Do you feel stiffness that lasts more than 30 minutes after waking up?",
  "Do you notice weakness while lifting objects, climbing stairs, or gripping?",
  "Have you had repeated sprains or injuries in the same area?",
  "Do you experience balance problems or have you fallen recently?",
  "Does pain disturb your sleep?",
  "Are you avoiding certain movements because you fear they will hurt?",
  "Have medicines or home remedies failed to improve your symptoms?",
  "Have you recently had surgery, a fracture, or prolonged immobilization?",
  "Have your symptoms persisted for more than 4 weeks?",
  "Do you think your physical problem is reducing your quality of life?",
];
const MAX = QUESTIONS.length; // 15

// Score → guidance band. `book` shows the "Book Appointment Now" CTA;
// `advice` points low scorers to the Home Advice section.
const BANDS = [
  { min: 0, max: 3, range: "0–3", head: "Low likelihood of needing physiotherapy",
    msg: "Monitor your symptoms and stay active. If anything changes or worsens, take this check again.", advice: true },
  { min: 4, max: 7, range: "4–7", head: "Mild functional limitation",
    msg: "A physiotherapy assessment may be beneficial if your symptoms continue over the next few days." },
  { min: 8, max: 11, range: "8–11", head: "Moderate limitation",
    msg: "Booking a physiotherapy assessment is recommended to address your symptoms before they progress." },
  { min: 12, max: 15, range: "12–15", head: "Significant limitation",
    msg: "A comprehensive physiotherapy evaluation is strongly recommended. Let's get you started.", book: true },
];

export default function Quiz() {
  const [answers, setAnswers] = useState(Array(MAX).fill(null));
  const [done, setDone] = useState(false);
  const [shownScore, setShownScore] = useState(0);

  const answered = answers.filter((a) => a !== null).length;
  const score = answers.reduce((a, b) => a + (b || 0), 0);
  const pct = Math.round((score / MAX) * 100);
  const band = BANDS.find((b) => score >= b.min && score <= b.max);

  function set(i, val) {
    setAnswers((prev) => { const n = [...prev]; n[i] = val; return n; });
  }
  function restart() { setAnswers(Array(MAX).fill(null)); setDone(false); setShownScore(0); }

  useEffect(() => {
    if (!done) return;
    let n = 0; const t = setInterval(() => { n += 1; if (n >= score) { n = score; clearInterval(t); } setShownScore(n); }, 55);
    return () => clearInterval(t);
  }, [done, score]);

  const RING = 327;

  if (done) {
    return (
      <div className="quiz">
        <div className="q-step q-result active">
          <svg className="q-ring" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(40,34,24,.1)" strokeWidth="8" />
            <circle cx="60" cy="60" r="52" fill="none" stroke="url(#qg)" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={RING} strokeDashoffset={RING - (RING * pct) / 100}
              transform="rotate(-90 60 60)" style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(.22,1,.36,1)" }} />
            <defs><linearGradient id="qg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3a7ca5" /><stop offset="1" stopColor="#2f6fb0" /></linearGradient></defs>
          </svg>
          <div className="q-score">{shownScore}<span className="q-score-max">/ 15</span></div>
          <span className="q-band-range">Score band {band.range}</span>
          <h3 style={{ fontSize: "1.6rem", marginTop: 6 }}>{band.head}</h3>
          <p className="q-sub" style={{ maxWidth: "48ch", margin: "14px auto 0" }}>{band.msg}</p>
          <div className="pill-row" style={{ justifyContent: "center", marginTop: 26 }}>
            {band.book && <Link href="/contact" className="btn btn-gold">Book Appointment Now <span className="arw">→</span></Link>}
            {!band.book && !band.advice && <Link href="/contact" className="btn btn-gold">Book an assessment <span className="arw">→</span></Link>}
            {band.advice && <Link href="/symptoms#home-advice" className="btn btn-gold">See home advice <span className="arw">→</span></Link>}
            <button className="btn btn-ghost" onClick={restart}>Retake</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz">
      <div className="q-prog"><i style={{ width: (answered / MAX) * 100 + "%" }} /></div>
      <div className="qa-topbar">
        <span className="muted" style={{ fontSize: ".82rem" }}>{answered} of {MAX} answered</span>
        <span className="qa-running">Running score <b>{score}</b> / {MAX}</span>
      </div>

      <ol className="qa-list">
        {QUESTIONS.map((q, i) => (
          <li className={"qa-item" + (answers[i] !== null ? " done" : "")} key={i}>
            <span className="qa-num">{i + 1}</span>
            <p className="qa-q">{q}</p>
            <div className="qa-toggle" role="group" aria-label={q}>
              <button type="button" className={"qa-opt yes" + (answers[i] === 1 ? " on" : "")} aria-pressed={answers[i] === 1} onClick={() => set(i, 1)}>Yes</button>
              <button type="button" className={"qa-opt no" + (answers[i] === 0 ? " on" : "")} aria-pressed={answers[i] === 0} onClick={() => set(i, 0)}>No</button>
            </div>
          </li>
        ))}
      </ol>

      <div className="qa-foot">
        <button className="btn btn-gold" disabled={answered < MAX} onClick={() => setDone(true)}>
          {answered < MAX ? `Answer ${MAX - answered} more to see your result` : "See my result"} <span className="arw">→</span>
        </button>
      </div>
    </div>
  );
}
