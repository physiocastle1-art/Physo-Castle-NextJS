import Link from "next/link";
import Reveal from "@/components/Reveal";
import BodyMap from "@/components/BodyMap";
import Quiz from "@/components/Quiz";
import Chatbot from "@/components/Chatbot";

export const metadata = { title: "Do I Need Physiotherapy? — Symptom Check | Physio Castle" };

export default function Symptoms() {
  return (
    <>
      <header className="page-hero">
        <div className="orb a" /><div className="orb b" />
        <div className="wrap">
          <Reveal as="span" className="crumb"><Link href="/">Home</Link> / Symptom Check</Reveal>
          <Reveal as="h1" delay={1} className="display" style={{ fontSize: "clamp(2.4rem,6.5vw,5.4rem)" }}>Do I really need <em>physiotherapy?</em></Reveal>
          <Reveal as="p" delay={2} className="lede mt-s">Answer a few quick questions. In under a minute you&apos;ll get a personalised indication — and you can ask our AI assistant anything along the way.</Reveal>
        </div>
      </header>

      <section className="section tight">
        <div className="wrap">
          <Reveal className="sec-head center"><span className="eyebrow">Point to your pain</span><h2 className="title">Where does it <em>hurt?</em></h2><p className="lede" style={{ margin: "0 auto" }}>Click a marker on the body — or pick an area from the list — and we&apos;ll suggest the conditions we commonly treat there, plus where to go next.</p></Reveal>
          <Reveal><BodyMap /></Reveal>
        </div>
      </section>

      <section className="section tight">
        <div className="wrap">
          <Reveal className="sec-head center">
            <span className="eyebrow">Do you really need a physio?</span>
            <h2 className="title">Two ways to <em>find out</em></h2>
            <p className="lede" style={{ margin: "0 auto" }}>Chat with our AI assistant for a quick answer, <em>or</em> take the 15-question self-assessment below for a scored result.</p>
          </Reveal>
        </div>
      </section>

      <section className="section tight" id="ask-pelu">
        <div className="wrap">
          <Reveal className="sec-head center">
            <span className="eyebrow">Option 1 — Ask our AI assistant</span>
            <h2 className="title">Have a quick <em>question?</em></h2>
            <p className="lede" style={{ margin: "0 auto" }}>Our AI assistant can help you understand your symptoms, our services and what to expect. For anything clinical, it will guide you to book with Dr. Riddhi.</p>
          </Reveal>
          <Reveal><Chatbot /></Reveal>
        </div>
      </section>

      <section className="section tight" id="self-assessment">
        <div className="wrap">
          <Reveal className="sec-head center"><span className="eyebrow">Option 2 — Self-assessment questionnaire</span><h2 className="title">The 15-point <em>check</em></h2><p className="lede" style={{ margin: "0 auto" }}>Answer Yes or No to each question. We&apos;ll total your score out of 15 and tell you what it suggests.</p></Reveal>
          <Reveal><Quiz /></Reveal>
          <p className="center muted mt-m" style={{ fontSize: ".82rem", maxWidth: "60ch", marginLeft: "auto", marginRight: "auto" }}>This self-check is for guidance only and is not a medical diagnosis. For a full evaluation, book an assessment with Dr. Riddhi Shah.</p>
        </div>
      </section>

      <section className="section tight" id="home-advice">
        <div className="wrap">
          <Reveal className="sec-head center"><span className="eyebrow">Home advice</span><h2 className="title">Simple things you can do <em>at home</em></h2><p className="lede" style={{ margin: "0 auto" }}>If your symptoms are mild, these general tips can help you stay comfortable and active while you monitor how you feel.</p></Reveal>
          <div className="advice-grid">
            {[
              ["Keep gently moving", "Avoid long periods of rest. Gentle, pain-free movement keeps joints and muscles healthy."],
              ["Mind your posture", "Set up your desk and phone at eye level, and take a short break to stand every 30–40 minutes."],
              ["Warmth & ice", "A warm pack can ease stiffness; ice can calm a fresh, swollen injury. Use for 10–15 minutes."],
              ["Sleep & hydration", "Good sleep and staying hydrated support tissue recovery more than most people expect."],
            ].map(([h, p]) => (
              <Reveal className="advice-card" key={h}><h3>{h}</h3><p>{p}</p></Reveal>
            ))}
          </div>
          <Reveal className="center mt-l">
            <p className="muted" style={{ fontSize: ".9rem" }}>Guided exercise photos and a full home-advice list are coming soon.</p>
            <Link href="/contact" className="btn btn-gold mt-s">Book an assessment <span className="arw">→</span></Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
