"use client";
/* ─────────────────────────────────────────────────────────────────────────
   A four-viewport scroll runway whose panel is sticky: vertical scroll is
   mapped onto horizontal travel of the card rail, driven through a spring
   rather than raw scroll position.

   DWELL_VIEWPORTS is the knob that buys reading time on the last card —
   without an explicit dwell, lengthening the runway only slows the scrub.
   Nothing calls preventDefault: the rail is a pure function of scroll, so the
   page still scrolls normally and the gesture is never stolen.
   ───────────────────────────────────────────────────────────────────────── */
import { useEffect, useRef } from "react";
import Link from "next/link";
import { Spring, subscribe, clamp } from "@/lib/dnMotion";
import { photo, SERVICE_PHOTOS } from "@/lib/dnImages";
import { Words } from "./Words";

const OVERLAY_VIEWPORTS = 1;   // the trailing viewport where About slides over
const DWELL_VIEWPORTS = 1;     // reading time on the final card
const SCRUB_CONFIG = { tension: 220, friction: 42 };

const ARROW = (
  <svg className="dn-arw" viewBox="0 0 19.0049 19" aria-hidden="true">
    <path d="M19.0049 1.18457H19.002V18.3564H17.8047V2.21973L0.84668 19L0 18.1621L17.1582 1.18457H0.453125V0H19.0049V1.18457Z" fill="currentColor" />
  </svg>
);

/* Card variants, exactly as the reference lays them out:
   "lime" carries the sub-service list, "brand" is solid green, "photo" is a
   full-bleed cover image with white text. */
const CARDS = [
  {
    n: "01", title: "Orthopaedic Rehabilitation", variant: "lime", href: "/services#svc-01",
    list: ["Low back &amp; neck pain", "Knee, hip &amp; shoulder pain", "Post-surgical / fracture"],
  },
  { n: "02", title: "Neurological Rehabilitation", variant: "photo", img: photo(SERVICE_PHOTOS.neuro, 800), href: "/services#svc-02" },
  { n: "03", title: "Cardiorespiratory Rehabilitation", variant: "brand", href: "/services#svc-03" },
  { n: "04", title: "Women's Health", variant: "photo", img: photo(SERVICE_PHOTOS.women, 800), href: "/services#svc-04" },
  { n: "05", title: "Stress Management", variant: "photo", img: photo(SERVICE_PHOTOS.stress, 800), href: "/services#svc-05" },
  { n: "06", title: "Fitness & Weight Loss", variant: "photo", img: photo(SERVICE_PHOTOS.fitness, 800), href: "/services#svc-06" },
];

export default function ServicesRunway() {
  const wrapRef = useRef(null);
  const trackRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;

    const scrub = new Spring(0, SCRUB_CONFIG, (x) => {
      track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
    });

    const unsub = subscribe(() => {
      const vh = window.innerHeight;
      const scrubbable = wrap.offsetHeight - vh * (1 + OVERLAY_VIEWPORTS + DWELL_VIEWPORTS);
      if (scrubbable <= 0) return;
      const p = clamp(-wrap.getBoundingClientRect().top / scrubbable, 0, 1);
      const travel = Math.max(track.scrollWidth - track.clientWidth, 0);
      scrub.set(-p * travel);
    });

    return () => { unsub(); scrub.stop(); };
  }, []);

  return (
    <div className="dn-runway" ref={wrapRef}>
      <section className="dn-sec dn-svc" id="dn-services">
        {/* positioning lives on wrapper divs, never on the split container itself */}
        <div className="dn-svc__head">
          <Words as="h2" preset="heading" className="title">
            Every stage of recovery, <em>under one roof</em>
          </Words>
        </div>
        <div className="dn-svc__eyebrow">
          <span className="eyebrow"><Words as="span" preset="eyebrow">Our Services</Words></span>
        </div>
        <div className="dn-svc__desc">
          <Words as="p" preset="body" className="lede">
            From a first assessment to a full rehabilitation programme — six directions covering
            pain relief, recovery and long-term strength.
          </Words>
        </div>

        <div className="dn-svc__rail">
          <div className="dn-svc__track" ref={trackRef}>
            {CARDS.map((c) => (
              <article className={`dn-card dn-card--${c.variant}${c.list ? " dn-card--wide" : ""}`} key={c.n}>
                {c.variant === "photo" && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="dn-card__img" src={c.img} alt="" loading="lazy" />
                )}
                <span className="dn-card__idx">{c.n}</span>
                <div className="dn-card__body">
                  <h3 className="dn-card__title">{c.title}</h3>
                  {c.list ? (
                    <ul className="dn-card__list">
                      {c.list.map((li) => (
                        <li key={li}>
                          <span dangerouslySetInnerHTML={{ __html: li }} />
                          {ARROW}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Link className="dn-card__cta" href={c.href}>
                      <span>Discover</span>
                      <span className="dn-ring">{ARROW}</span>
                    </Link>
                  )}
                </div>
              </article>
            ))}

            <article className="dn-card dn-card--tail">
              <span className="dn-card__idx">—</span>
              <div className="dn-card__body">
                <h3 className="dn-card__title">And every condition in between</h3>
                <Link className="dn-card__cta" href="/services">
                  <span>Explore all</span>
                  <span className="dn-ring">{ARROW}</span>
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
