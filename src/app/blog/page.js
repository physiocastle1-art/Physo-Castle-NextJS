import Link from "next/link";
import Reveal from "@/components/Reveal";
import Accordion from "@/components/Accordion";
import SenseiScroll from "@/components/SenseiScroll";

export const metadata = { title: "Journal & Tips — Physio Castle" };

const POSTS = [
  ["Back Health", "5 desk-posture fixes that quietly end back pain", "Small changes to how you sit can undo hours of strain. Here's where to start.", "6 min read · Guidelines"],
  ["Recovery", "Heat or ice? The simple rule most people get wrong", "Knowing which to use — and when — can speed up healing dramatically.", "4 min read · Tips"],
  ["Women's Health", "Safe movement through every trimester", "A physiotherapist's guide to staying strong and comfortable during pregnancy.", "8 min read · Wellness"],
  ["Neuro", "Rebuilding balance after a stroke", "Why consistency beats intensity in neurological recovery — and how to pace it.", "7 min read · Guidelines"],
  ["Breathing", "Breathing drills for post-COVID stamina", "Three gentle exercises to rebuild lung capacity and ease breathlessness.", "5 min read · Tips"],
  ["Wellness", "The 10-minute mobility routine for stiff mornings", "Loosen up, protect your joints and start your day moving freely.", "5 min read · Wellness"],
];

const FAQ = [
  { q: "Do I need a doctor's referral to see a physiotherapist?", a: "No — you can book directly with us. If we feel you'd benefit from input from another specialist, we'll let you know and help coordinate it." },
  { q: "What should I bring or wear to my first session?", a: "Wear comfortable clothing that allows easy movement. Bring any relevant scans, reports or a list of medications. That's it — we'll take care of the rest." },
  { q: "How long is each appointment?", a: "Your first assessment usually takes 45–60 minutes. Follow-up treatment sessions are typically 30–45 minutes, depending on your plan." },
  { q: "Do you offer home visits and online consultations?", a: "Yes. We provide clinic visits, home visits for those who can't travel easily, and teleconsultation by video for guidance, reviews and exercise progression." },
  { q: "How many sessions will I need?", a: "It depends on your condition and goals. After your assessment, Dr. Riddhi will give you an honest estimate and clear milestones, and we adjust as you progress." },
  { q: "Is physiotherapy painful?", a: "Treatment should never be about pushing through severe pain. Some techniques may feel intense briefly, but we always work within your comfort and explain everything as we go." },
];

export default function Blog() {
  return (
    <>
      <header className="page-hero">
        <div className="orb a" /><div className="orb b" />
        <div className="wrap">
          <Reveal as="span" className="crumb"><Link href="/">Home</Link> / Journal</Reveal>
          <Reveal as="h1" delay={1} className="display" style={{ fontSize: "clamp(2.6rem,7vw,6rem)" }}>The <em>journal</em></Reveal>
          <Reveal as="p" delay={2} className="lede mt-s">Health and wellness guidelines, recovery tips and evidence-based articles — written to help you move and live better.</Reveal>
        </div>
      </header>

      <SenseiScroll />

      <section className="section tight">
        <div className="wrap">
          <Reveal className="sec-head center"><span className="eyebrow">FAQ</span><h2 className="title">Questions, <em>answered</em></h2></Reveal>
          <Reveal><Accordion items={FAQ} /></Reveal>
        </div>
      </section>

      <section className="section tight">
        <div className="wrap">
          <Reveal className="book-bar"><div className="gl" /><div><span className="eyebrow">Still have a question?</span><h2 style={{ marginTop: 16 }}>We&apos;re happy to help — reach out anytime.</h2></div><Link href="/contact" className="btn btn-gold">Contact us <span className="arw">→</span></Link></Reveal>
        </div>
      </section>
    </>
  );
}
