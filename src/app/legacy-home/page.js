import Link from "next/link";
import Reveal from "@/components/Reveal";
import LandingIntro from "@/components/LandingIntro";
import SmudgeReveal from "@/components/SmudgeReveal";
import MosaicFlip from "@/components/MosaicFlip";
import HomeExperience from "@/components/HomeExperience";
import HorizontalPages from "@/components/HorizontalPages";
import ParallaxStats from "@/components/ParallaxStats";
import BlueTakeover from "@/components/BlueTakeover";
import MarqueeReveal from "@/components/MarqueeReveal";
import BentoGrid from "@/components/BentoGrid";

/* The previous homepage, kept intact for comparison after the Dantora rebuild
   took over "/". Not indexed — it is a duplicate of the live page's content. */
export const metadata = {
  title: "Previous homepage — Physio Castle",
  robots: { index: false, follow: false },
};

export default function LegacyHome() {
  return (
    <HomeExperience>
      <LandingIntro />

      <section className="trustbar">
        <div className="wrap" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <div className="trust-grid">
            <Reveal className="cell"><div className="n">PT</div><p>Licensed &amp; Certified</p></Reveal>
            <Reveal delay={1} className="cell"><div className="n">1:1</div><p>Personal Attention</p></Reveal>
            <Reveal delay={2} className="cell"><div className="n">★ 4.9</div><p>Google Rated</p></Reveal>
            <Reveal delay={3} className="cell"><div className="n">⌂</div><p>Home Visits Available</p></Reveal>
          </div>
        </div>
      </section>

      <ParallaxStats />

      <HorizontalPages />

      <MarqueeReveal />

      <section className="section tight snap-sec">
        <div className="wrap">
          <Reveal className="sec-head"><span className="eyebrow">What we treat</span><h2 className="title">Care for <em>every</em> stage of life.</h2><p className="lede">Hover a focus area to flip through the care we provide — orthopaedic to women&apos;s health.</p></Reveal>
          <Reveal><MosaicFlip /></Reveal>
          <Reveal className="center mt-l"><Link href="/services" className="btn btn-ghost">Explore all services <span className="arw">→</span></Link></Reveal>
        </div>
      </section>

      <BentoGrid />

      <section className="section tight snap-sec smudge-zone" id="dig-in">
        <div className="wrap">
          <Reveal><SmudgeReveal /></Reveal>
        </div>
      </section>

      <BlueTakeover />
    </HomeExperience>
  );
}
