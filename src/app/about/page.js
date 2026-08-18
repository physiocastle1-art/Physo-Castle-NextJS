import Link from "next/link";
import Reveal from "@/components/Reveal";
import HealthMeter from "@/components/HealthMeter";
import CrtDisplay from "@/components/CrtDisplay";
import Copy from "@/components/Copy";

export const metadata = { title: "About — Physio Castle | Dr. Riddhi Shah" };

export default function About() {
  return (
    <>
      <header className="page-hero">
        <div className="orb a" />
        <div className="wrap">
          <Reveal as="span" className="crumb"><Link href="/">Home</Link> / About</Reveal>
          <Reveal as="h1" delay={1} className="display" style={{ fontSize: "clamp(2.6rem,7vw,6rem)" }}>About <em>us</em></Reveal>
          <Reveal as="p" delay={2} className="lede mt-s">A studio built on a simple belief — that healing should feel as good as it works.</Reveal>
        </div>
      </header>

      <section className="section tight" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <Reveal><CrtDisplay /></Reveal>
        </div>
      </section>

      <section className="section tight">
        <div className="wrap">
          <div className="split">
            <div>
              <span className="eyebrow">About Physio Castle</span>
              <Copy><h2 className="title mt-s">Where clinical science meets sincere care.</h2></Copy>
              <Copy><p className="lede mt-s">Physio Castle was founded to change how recovery feels. Too often, physiotherapy is rushed, impersonal and one-size-fits-all. We do the opposite — unhurried assessments, evidence-based treatment, and a calm space designed to help your nervous system settle and your body restore.</p></Copy>
              <p className="muted mt-m">From the first session to your final goal, you work with someone who knows your story. We blend manual therapy, exercise rehabilitation, modern modalities and patient education into one continuous, measurable journey — Book, Assess, Treat, Recover.</p>
              <ul className="feature-list">
                <li><span className="k">01</span><div><b>Root-cause focused</b><br /><span className="muted">We treat the source of dysfunction, not just the symptom.</span></div></li>
                <li><span className="k">02</span><div><b>One-to-one always</b><br /><span className="muted">No double-booking. Your full session is yours alone.</span></div></li>
                <li><span className="k">03</span><div><b>Care that travels</b><br /><span className="muted">Clinic visits, home visits and online teleconsultation.</span></div></li>
              </ul>
            </div>
            <Reveal delay={2}>
              <div className="portrait"><div className="ini">PC</div><div className="tag"><div><b>Physio Castle</b></div><small>Studio of recovery</small></div></div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section tight">
        <div className="wrap">
          <div className="split">
            <Reveal><div className="portrait"><div className="ini">RS</div><div className="tag"><div><b>Dr. Riddhi Shah</b></div><small>Founder · Physiotherapist</small></div></div></Reveal>
            <Reveal delay={1}>
              <span className="eyebrow">About me &amp; you</span>
              <h2 className="title mt-s">Dr. Riddhi <em>Shah</em></h2>
              <p className="lede mt-s">&ldquo;I became a physiotherapist because I believe the body is remarkably capable of healing — it just needs the right guidance, in the right order, at the right pace.&rdquo;</p>
              <p className="muted mt-m">With years of clinical experience across orthopaedic, neurological, cardiorespiratory and women&apos;s health rehabilitation, Dr. Riddhi Shah brings both technical depth and genuine warmth to every patient. Her approach is collaborative: you are an active partner in your recovery, not a passive patient.</p>
              <p className="muted mt-s">Every plan is personal. Every session is purposeful. And every milestone — from your first pain-free morning to your return to the things you love — is something you reach together.</p>
              <div className="pill-row"><span className="pill on">Orthopaedic</span><span className="pill on">Neurological</span><span className="pill on">Women&apos;s Health</span><span className="pill on">Cardiorespiratory</span></div>
              <div className="mt-l"><Link href="/contact" className="btn btn-gold">Meet Dr. Riddhi <span className="arw">→</span></Link></div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section tight">
        <div className="wrap">
          <Reveal className="sec-head center">
            <span className="eyebrow">Health Meter</span>
            <h2 className="title">Where does your body <em>stand</em> today?</h2>
            <p className="lede" style={{ margin: "0 auto" }}>The Health Meter is our simple way of mapping the pillars of physical wellbeing — so we can see, together, where to begin and how far you&apos;ve come.</p>
          </Reveal>
          <Reveal><HealthMeter /></Reveal>
          <Reveal className="center mt-l"><Link href="/symptoms" className="btn btn-gold">Measure my health score <span className="arw">→</span></Link></Reveal>
        </div>
      </section>

      <section className="section tight">
        <div className="wrap">
          <Reveal className="book-bar"><div className="gl" /><div><span className="eyebrow">Start your story</span><h2 style={{ marginTop: 16 }}>Let&apos;s find out what your body needs.</h2></div><Link href="/contact" className="btn btn-gold">Book Appointment <span className="arw">→</span></Link></Reveal>
        </div>
      </section>
    </>
  );
}
