import Link from "next/link";
import Reveal from "@/components/Reveal";
import PublicReviewSection from "@/components/PublicReviewSection";

export const metadata = { title: "Patient Stories — Physio Castle" };

const REVIEWS = [
  ["A", "Aarti M.", "Orthopaedic rehab", "After my knee surgery I could barely walk. Dr. Riddhi built a plan that actually made sense — three months later I'm back to my morning runs."],
  ["R", "Rohan D.", "Neuro rehab (family)", "The home visits were a blessing for my father's stroke recovery. Patient, skilled and so kind. We saw real progress every single week."],
  ["S", "Sneha P.", "Low back pain", "My chronic back pain is finally gone. What I loved most was being taught how to prevent it from coming back, not just treating it."],
  ["K", "Kavya N.", "Women's health", "The post-natal programme helped me feel like myself again. Gentle, private and genuinely caring. I recommend Physio Castle to every new mum."],
  ["V", "Vikram S.", "Cardiorespiratory rehab", "Recovering after CABG surgery felt overwhelming until I started here. My breathing and stamina improved more than I imagined possible."],
  ["M", "Meera J.", "Stress management", "The yoga and stress-management sessions reset my whole week. The space is calm, the attention is personal. A rare find."],
  ["T", "Tejas R.", "Shoulder pain", "Frozen shoulder had me stuck for months. Hands-on therapy plus the right exercises got my arm moving again. Worth every session."],
  ["N", "Nisha A.", "Teleconsultation", "Professional, warm and effective. The teleconsultation option meant I never missed a session even when travelling for work."],
  ["P", "Pranav K.", "Post-COVID rehab", "Post-COVID I struggled with breathlessness for ages. The respiratory rehab here gave me my energy and confidence back."],
];

export default function Testimonials() {
  return (
    <>
      <header className="page-hero">
        <div className="orb a" /><div className="orb b" />
        <div className="wrap">
          <Reveal as="span" className="crumb"><Link href="/">Home</Link> / Reviews</Reveal>
          <Reveal as="h1" delay={1} className="display" style={{ fontSize: "clamp(2.6rem,7vw,6rem)" }}>Patient <em>stories</em></Reveal>
          <Reveal as="p" delay={2} className="lede mt-s">The truest measure of our work is how our patients move, feel and live afterwards.</Reveal>
          <Reveal delay={3} className="pill-row">
            <span className="gbadge"><b>★ 4.9</b> average rating</span>
            <span className="gbadge"><b>200+</b> Google reviews</span>
            <span className="gbadge"><b>98%</b> would recommend</span>
          </Reveal>
        </div>
      </header>

      <section className="section tight">
        <div className="wrap">
          <PublicReviewSection />
        </div>
      </section>

      <section className="section tight">
        <div className="wrap">
          <Reveal className="sec-head"><span className="eyebrow">In their words</span><h2 className="title">Verified <em>stories</em></h2></Reveal>
          <div className="tcols">
            {REVIEWS.map(([av, name, role, text]) => (
              <Reveal className="tcard" key={name}>
                <div className="stars">★★★★★</div>
                <p>&ldquo;{text}&rdquo;</p>
                <div className="who"><div className="av">{av}</div><div><b>{name}</b><small>{role}</small></div></div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section tight">
        <div className="wrap">
          <Reveal className="sec-head"><span className="eyebrow">See &amp; hear</span><h2 className="title">Video <em>testimonials</em></h2></Reveal>
          <div className="svc-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
            {[["I walk pain-free again", "Aarti's knee recovery"], ["My dad's second start", "Stroke rehab journey"], ["Breathing freely", "Post-COVID recovery"]].map(([t, s], i) => (
              <Reveal className="tcard video" delay={i} key={t}><div className="thumb"><div className="play">▶</div></div><div className="cap"><b style={{ fontFamily: "var(--serif)", fontSize: "1.2rem" }}>&ldquo;{t}&rdquo;</b><p className="muted" style={{ marginTop: 6, fontSize: ".86rem" }}>{s}</p></div></Reveal>
            ))}
          </div>
          <p className="center muted mt-m" style={{ fontSize: ".84rem" }}>Video stories shared with patient consent. <span className="serif-accent">More coming soon.</span></p>
        </div>
      </section>

      <section className="section tight">
        <div className="wrap">
          <Reveal className="book-bar">
            <div className="gl" />
            <div><span className="eyebrow">Verified on Google</span><h2 style={{ marginTop: 16 }}>Rated <span className="serif-accent">4.9 ★</span> by 200+ patients on Google.</h2></div>
            <div className="pill-row" style={{ margin: 0 }}>
              <a href="https://www.google.com/maps/search/Physio+Castle+Surat" target="_blank" rel="noopener noreferrer" className="btn btn-gold">Read Google reviews <span className="arw">→</span></a>
              <Link href="/contact" className="btn btn-ghost">Leave a review</Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
