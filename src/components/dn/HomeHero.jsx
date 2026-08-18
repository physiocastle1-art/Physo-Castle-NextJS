import Link from "next/link";
import DnaInk from "./DnaInk";
import { Words, RevealEl } from "./Words";

const CHIPS = ["Exercise therapy", "Manual therapy", "Electrotherapy", "Kinesio taping", "Home visits"];

/* Hero: copy pinned at the artboard's own coordinates on the left, the live
   helix filling the right. Entry cascade (ms): copy 0 (it carries its own word
   stagger), rule 140, trust 220, chips 300, actions 380. */
export default function HomeHero() {
  return (
    <section className="dn-sec dn-hero" id="dn-hero">
      <div className="dn-hero__copy">
        <span className="eyebrow">
          <Words as="span" preset="eyebrow">Physiotherapy &amp; Rehabilitation</Words>
        </span>
        <Words as="h1" preset="heading" className="dn-h1">
          Recovery that comes <em>home</em> to you
        </Words>
        <Words as="p" preset="body" className="dn-lead">
          Home visit physiotherapy in Surat, led by <strong>Dr. Riddhi Shah (PT)</strong> — personalised,
          one-on-one care at your doorstep. No waiting rooms, no travel stress.
        </Words>
      </div>

      <DnaInk className="dn-hero__scene" />

      <RevealEl className="dn-hero__rule" delay={140} />

      <RevealEl className="dn-hero__trust" delay={220}>
        <p className="dn-lead">★ 4.9 average rating from 200+ Google reviews</p>
        <span className="dn-hair" />
      </RevealEl>

      <RevealEl className="dn-hero__chips" delay={300}>
        {CHIPS.map((c) => (
          <span className="dn-chip" key={c}>{c}</span>
        ))}
      </RevealEl>

      <RevealEl className="dn-hero__actions" delay={380}>
        <Link href="/contact" className="btn btn-gold">Book Appointment</Link>
        <Link href="/services" className="btn btn-ghost">Explore Treatments <span className="arw">→</span></Link>
      </RevealEl>
    </section>
  );
}
