import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand">
            <Link href="/" className="brand">
              <img src="/logo/physio-castle-logo.jpg" alt="Physio Castle Logo" className="brand-logo-img" />
              <b>Physio</b>&nbsp;<span>Castle</span>
            </Link>
            <p>Premium, evidence-based physiotherapy &amp; rehabilitation led by Dr. Riddhi Shah.</p>
            {/* Swap these placeholder URLs for the real profile links. */}
            <div className="foot-social">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">◎</a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">f</a>
              <a href="https://wa.me/919512346056" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">✆</a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube">▶</a>
            </div>
          </div>
          <div>
            <h4>Explore</h4>
            <Link href="/about">About</Link><Link href="/services">Services</Link>
            <Link href="/symptoms">Symptom Check</Link><Link href="/blog">Journal</Link>
          </div>
          <div>
            <h4>Care</h4>
            <Link href="/services#svc-01">Orthopaedic</Link><Link href="/services#svc-02">Neurological</Link>
            <Link href="/services#svc-04">Women&apos;s Health</Link><Link href="/services#svc-03">Cardiorespiratory</Link>
          </div>
          <div>
            <h4>Get in touch</h4>
            <Link href="/contact">Book a home visit</Link><Link href="/contact">Teleconsultation</Link>
            <a href="mailto:hello@physiocastle.com">hello@physiocastle.com</a>
            <a href="tel:+919512346056">+91 95123 46056</a>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© 2026 Physio Castle. All rights reserved.</span>
          <span>Book · Assess · Treat · Recover</span>
        </div>
      </div>
    </footer>
  );
}
