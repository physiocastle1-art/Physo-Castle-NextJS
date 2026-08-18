"use client";
import { useEffect, useRef, useState } from "react";

const QUICK = [
  ["Back pain?", "Do I need physiotherapy for back pain?"],
  ["Home visits?", "Do you offer home visits?"],
  ["First session?", "What happens in a first session?"],
  ["Pricing?", "How much does it cost?"],
];

function reply(qRaw) {
  const q = qRaw.toLowerCase();
  if (/back|neck|spine/.test(q)) return "Back and neck pain are among the most common things we treat. If it's lasted more than a few days or limits movement, physiotherapy can help a lot. Try the symptom check, or book an assessment.";
  if (/home|visit/.test(q)) return "Yes — we offer home visits so you can recover in comfort. You can request one on our Contact page.";
  if (/online|tele|video/.test(q)) return "We do! Teleconsultation lets Dr. Riddhi assess and guide you by video. Book it on the Contact page.";
  if (/first|session|expect|assessment/.test(q)) return "Your first session is a thorough assessment — we discuss your history, screen your movement, find the root cause and design your plan together. It usually takes 45–60 minutes.";
  if (/cost|price|fee|charge/.test(q)) return "Pricing depends on the service and whether it's at the clinic, home or online. Share your details on the Contact page and we'll send you the options.";
  if (/stroke|parkinson|neuro|nerve/.test(q)) return "We provide neurological rehabilitation for stroke, Parkinson's, brain and nerve injuries. Early, consistent therapy makes a real difference.";
  if (/pregnan|prenatal|postnatal|pcos|menopaus|women/.test(q)) return "Our women's health programme covers pre/post-natal care, PCOS, menstrual pain and menopause. It's gentle, specialised and private.";
  if (/yoga|zumba|pilates|fitness|weight/.test(q)) return "We run Yoga, Zumba, Pilates and fitness/weight-loss sessions — therapeutic and fun. Group and private options are available.";
  if (/thank/.test(q)) return "Anytime! 🌿 Whenever you're ready, we're here to help you move and feel better.";
  if (/\b(hi|hello|hey)\b/.test(q)) return "Hello! 😊 Ask me about your symptoms, our services, home visits or booking.";
  return "Thank you for your question. For any further queries or personalised guidance, please contact Dr. Riddhi Shah directly — call or WhatsApp +91 95123 46056, or book an appointment on the Contact page.";
}

export default function Chatbot() {
  const [msgs, setMsgs] = useState([{ who: "bot", text: "Hi! I'm your Physio Castle AI assistant 🌿 How can I help you today?" }]);
  const [typing, setTyping] = useState(false);
  const [val, setVal] = useState("");
  const bodyRef = useRef(null);

  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, [msgs, typing]);

  function send(text) {
    if (!text.trim()) return;
    setMsgs((m) => [...m, { who: "user", text }]);
    setTyping(true);
    setTimeout(() => { setTyping(false); setMsgs((m) => [...m, { who: "bot", text: reply(text) }]); }, 650);
  }

  return (
    <div className="chat">
      <div className="chat-head">
        <div className="av">AI</div>
        <div><b>AI Assistant</b><br /><small>Online · Physio Castle</small></div>
      </div>
      <div className="chat-body" ref={bodyRef}>
        {msgs.map((m, i) => <div className={"msg " + m.who} key={i}>{m.text}</div>)}
        {typing && <div className="msg bot">…</div>}
      </div>
      <div className="chat-quick">
        {QUICK.map(([label, q]) => <button key={label} onClick={() => send(q)}>{label}</button>)}
      </div>
      <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(val); setVal(""); }}>
        <input type="text" placeholder="Type your question…" value={val} onChange={(e) => setVal(e.target.value)} />
        <button type="submit" aria-label="Send">→</button>
      </form>
    </div>
  );
}
