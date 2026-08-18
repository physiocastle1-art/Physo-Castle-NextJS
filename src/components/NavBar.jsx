"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const SERVICES_MENU = [
  { slug: "ortho", label: "Orthopaedic Rehabilitation", tagline: "Bones, joints, spine & post-op", icon: "🦴" },
  { slug: "neuro", label: "Neurological Rehabilitation", tagline: "Stroke, Parkinson's & balance", icon: "🧠" },
  { slug: "cardio", label: "Cardiorespiratory Care", tagline: "Heart, lungs & stamina rehab", icon: "🫁" },
  { slug: "women", label: "Women's Health", tagline: "Pelvic, pre & post-natal care", icon: "🌸" },
  { slug: "stress", label: "Stress Management", tagline: "Restorative tension release", icon: "🌿" },
  { slug: "fitness", label: "Fitness & Weight Loss", tagline: "Physio-guided medical fitness", icon: "🏋️" },
  { slug: "yoga", label: "Yoga · Zumba · Pilates", tagline: "Therapeutic movement & core", icon: "🧘" },
];

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [servicesOpen, setServicesOpen] = useState(false);
  const dropdownRef = useRef(null);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? (window.scrollY / h) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setOpen(false);
    setServicesOpen(false);
  }, [pathname]);

  // Click outside to close dropdown ("touchstart" too: a tap fires no mousedown
  // until it has already resolved, so a touch-only device never closed it)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setServicesOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  /* The mobile panel is a full-screen scroll container. Without freezing the
     page underneath it, a drag inside the menu scrolls the article behind it
     and the menu appears to stick. */
  useEffect(() => {
    document.body.classList.toggle("nav-open", open);
    return () => document.body.classList.remove("nav-open");
  }, [open]);

  return (
    <>
      <div className="scrollbar" style={{ width: progress + "%" }} />
      <nav className={"nav" + (scrolled ? " scrolled" : "")}>
        <Link href="/" className="brand">
          <img src="/logo/physio-castle-logo.jpg" alt="Physio Castle Logo" className="brand-logo-img" />
          <b>Physio</b>&nbsp;<span>Castle</span>
        </Link>

        <div className={"nav-links" + (open ? " open" : "")}>
          <Link href="/" className={pathname === "/" ? "active" : ""} onClick={() => setOpen(false)}>
            Home
          </Link>
          <Link href="/about" className={pathname === "/about" ? "active" : ""} onClick={() => setOpen(false)}>
            About
          </Link>

          {/* Services Dropdown */}
          <div
            className="nav-dropdown-wrap"
            ref={dropdownRef}
            onMouseEnter={() => setServicesOpen(true)}
            onMouseLeave={() => setServicesOpen(false)}
          >
            {/* The label used to be a <Link> nested inside a <button> — invalid
                markup, and on a phone the whole row navigated, so the submenu
                was only reachable by hitting the arrow glyph itself. They are
                siblings now: the label goes to /services, the arrow expands. */}
            <div className={`nav-dropdown-trigger ${pathname.startsWith("/services") ? "active" : ""}`}>
              <Link href="/services" className="nav-dropdown-label" onClick={() => setOpen(false)}>
                Services
              </Link>
              <button
                type="button"
                className="nav-dropdown-arw-btn"
                onClick={() => setServicesOpen((v) => !v)}
                aria-expanded={servicesOpen}
                aria-label={servicesOpen ? "Hide service list" : "Show service list"}
              >
                <span className={`nav-arw ${servicesOpen ? "up" : ""}`}>▾</span>
              </button>
            </div>

            {servicesOpen ? (
              <div className="nav-dropdown-menu">
                <div className="nav-dropdown-header">
                  <span>Specialised Clinical Care</span>
                </div>
                <div className="nav-dropdown-list">
                  {SERVICES_MENU.map((s) => (
                    <Link
                      key={s.slug}
                      href={`/services#svc-${s.slug}`}
                      className="nav-dropdown-item"
                      onClick={() => {
                        setServicesOpen(false);
                        setOpen(false);
                      }}
                    >
                      <span className="nav-dropdown-ico">{s.icon}</span>
                      <div className="nav-dropdown-text">
                        <strong>{s.label}</strong>
                        <small>{s.tagline}</small>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="nav-dropdown-footer">
                  <Link
                    href="/services"
                    onClick={() => {
                      setServicesOpen(false);
                      setOpen(false);
                    }}
                  >
                    View All Services &amp; Packages <span className="arw">→</span>
                  </Link>
                </div>
              </div>
            ) : null}
          </div>

          <Link href="/symptoms" className={pathname === "/symptoms" ? "active" : ""} onClick={() => setOpen(false)}>
            Symptom Check
          </Link>
          <Link href="/testimonials" className={pathname === "/testimonials" ? "active" : ""} onClick={() => setOpen(false)}>
            Reviews
          </Link>
          <Link href="/blog" className={pathname === "/blog" ? "active" : ""} onClick={() => setOpen(false)}>
            Journal
          </Link>
          <Link href="/contact" className={pathname === "/contact" ? "active" : ""} onClick={() => setOpen(false)}>
            Contact
          </Link>

          {/* .nav-cta is display:none under 920px — this is the same action,
              styled for the panel, so the primary CTA survives on a phone */}
          <Link href="/contact" className="nav-links-cta" onClick={() => setOpen(false)}>
            Book Appointment
          </Link>
        </div>

        <Link href="/contact" className="nav-cta">
          Book Appointment
        </Link>
        <button
          className={"burger" + (open ? " open" : "")}
          aria-label="Menu"
          onClick={() => setOpen((o) => !o)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </nav>

      <style jsx>{`
        .nav-dropdown-wrap {
          position: relative;
          display: inline-flex;
          align-items: center;
        }

        .nav-dropdown-trigger {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          position: relative;
        }

        /* .nav-dropdown-label is a next/link — styled-jsx cannot scope a custom
           component, so its rules live in globals.css beside .nav-links a. */

        /* its own button, so the arrow is a real target rather than a glyph
           inside the link — 40px square is the minimum a thumb can hit */
        .nav-dropdown-arw-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
        }

        .nav-arw {
          font-size: 0.75rem;
          transition: transform 0.3s ease;
          color: var(--gold, #2a523b);
          line-height: 1;
        }
        .nav-arw.up {
          transform: rotate(180deg);
        }

        .nav-dropdown-menu {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          width: 320px;
          background: #ffffff;
          border: 1px solid rgba(18, 33, 25, 0.12);
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(42, 82, 59, 0.08);
          padding: 8px;
          z-index: 200;
          animation: navDropFade 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
        }

        @keyframes navDropFade {
          from {
            opacity: 0;
            transform: translate(-50%, 8px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }

        .nav-dropdown-header {
          padding: 8px 12px 6px;
          border-bottom: 1px solid rgba(18, 33, 25, 0.06);
          margin-bottom: 4px;
        }
        .nav-dropdown-header span {
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--gold, #2a523b);
          font-weight: 700;
        }

        .nav-dropdown-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .nav-dropdown-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 10px;
          transition: background 0.2s ease;
          text-decoration: none;
        }

        .nav-dropdown-item:hover {
          background: rgba(42, 82, 59, 0.07);
        }

        .nav-dropdown-ico {
          font-size: 1.1rem;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #faf6ee;
          border-radius: 8px;
          flex-shrink: 0;
        }

        .nav-dropdown-text {
          display: flex;
          flex-direction: column;
        }

        .nav-dropdown-text strong {
          font-size: 0.85rem;
          color: #17231c;
          font-weight: 500;
          line-height: 1.2;
        }

        .nav-dropdown-text small {
          font-size: 0.74rem;
          color: #64748b;
          margin-top: 2px;
        }

        .nav-dropdown-footer {
          margin-top: 6px;
          padding: 8px 12px 4px;
          border-top: 1px solid rgba(18, 33, 25, 0.06);
          text-align: center;
        }

        .nav-dropdown-footer a {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--gold, #2a523b);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .nav-dropdown-footer a:hover {
          color: var(--gold-bright, #488b63);
        }

        @media (max-width: 920px) {
          .nav-dropdown-wrap {
            width: 100%;
            flex-direction: column;
            align-items: stretch;
          }
          /* the row spans the panel so the arrow sits at the far edge, well
             clear of the label's own tap area */
          .nav-dropdown-trigger {
            width: 100%;
            justify-content: space-between;
            gap: 12px;
          }
          .nav-dropdown-arw-btn {
            width: 44px;
            height: 44px;
            flex: 0 0 auto;
            border-radius: 50%;
            border: 1px solid rgba(42, 82, 59, 0.16);
          }
          .nav-arw {
            font-size: 0.95rem;
          }
          .nav-dropdown-menu {
            position: relative;
            top: 0;
            left: 0;
            transform: none;
            width: 100%;
            box-shadow: none;
            border: 1px solid rgba(42, 82, 59, 0.12);
            background: #ffffff;
            margin-top: 10px;
            animation: none;   /* the slide-down reads as a glitch inside a panel that already slid in */
          }
          .nav-dropdown-item {
            padding: 12px;
          }
          .nav-dropdown-text strong {
            font-size: 0.92rem;
          }
        }

        @media (hover: none) {
          /* a tapped item keeps :hover until the next tap somewhere else */
          .nav-dropdown-item:hover {
            background: none;
          }
          .nav-dropdown-item:active {
            background: rgba(42, 82, 59, 0.07);
          }
        }
      `}</style>
    </>
  );
}
