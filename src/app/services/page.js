import Link from "next/link";
import Reveal from "@/components/Reveal";
import ServicesShowcase from "@/components/ServicesShowcase";
import InteractiveServices from "@/components/InteractiveServices";

export const metadata = { title: "Services — Physio Castle | Rehabilitation & Wellness" };

// Flat lists from the clinic brief — shown as chip grids further down the page.
const CONDITIONS = [
  "Shoulder pain", "Upper back pain", "Lower back pain", "Knee pain", "Osteoarthritis",
  "Post-operative rehabilitation", "Balance training", "Neurorehabilitation (Stroke, Parkinson's)",
  "Pelvic floor rehabilitation", "Stress management", "Pediatric sensory integration therapy",
  "Ergonomic training", "Cardio-respiratory rehabilitation",
];
const PROVIDED = [
  "Exercise therapy", "Manual therapy", "Electrotherapy", "Thermotherapy", "Cryotherapy",
  "Kinesio Taping", "Fitness training", "Stress management / relaxation therapy",
];

export default function Services() {
  return (
    <>
      <ServicesShowcase />

      <InteractiveServices />

      <section className="section tight">
        <div className="wrap">
          <div className="list-split">
            <Reveal className="list-block">
              <span className="eyebrow">Conditions we treat</span>
              <h2 className="title" style={{ fontSize: "clamp(1.8rem,3.4vw,2.6rem)" }}>What we <em>help with</em></h2>
              <ul className="chip-list">{CONDITIONS.map((c) => <li key={c}>{c}</li>)}</ul>
              <p className="muted mt-s" style={{ fontSize: ".84rem" }}>More conditions will be added soon.</p>
            </Reveal>
            <Reveal delay={1} className="list-block">
              <span className="eyebrow">Services we provide</span>
              <h2 className="title" style={{ fontSize: "clamp(1.8rem,3.4vw,2.6rem)" }}>How we <em>treat</em></h2>
              <ul className="chip-list">{PROVIDED.map((c) => <li key={c}>{c}</li>)}</ul>
              <p className="muted mt-s" style={{ fontSize: ".84rem" }}>More services will be added soon.</p>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section tight">
        <div className="wrap">
          <Reveal className="sec-head center"><span className="eyebrow">Every service, one journey</span><h2 className="title">Book · Assess · Treat · <em>Recover</em></h2></Reveal>
          <div className="process">
            {[["01", "Book", "Choose your service and slot — clinic, home or online."],
              ["02", "Assess", "A complete evaluation to design the right programme."],
              ["03", "Treat", "Hands-on therapy and exercise, adapted to your progress."],
              ["04", "Recover", "Lasting results with prevention and self-care guidance."]].map(([n, h, p], i) => (
              <Reveal className="step" delay={i} key={n}><div className="num">{n}</div><h3>{h}</h3><p>{p}</p></Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section tight">
        <div className="wrap">
          <Reveal className="book-bar">
            <div className="gl" />
            <div><span className="eyebrow">Not sure which is right?</span><h2 style={{ marginTop: 16 }}>Take the symptom check — we&apos;ll point you to the right care.</h2></div>
            <div className="pill-row" style={{ margin: 0 }}>
              <Link href="/symptoms" className="btn btn-gold">Check my symptoms <span className="arw">→</span></Link>
              <Link href="/contact" className="btn btn-ghost">Book now</Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
