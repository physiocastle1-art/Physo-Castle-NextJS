"use client";
/* ─────────────────────────────────────────────────────────────────────────
   The Instagram wall.

   These are Instagram's OWN embeds — the same blockquote + embed.js the copy-
   embed dialog on instagram.com hands you. That is deliberate: it needs no API
   key, no Business account and no third-party widget subscription, and the post
   stays live, so a caption edited on the phone is edited here too.

   Two things it must not do:

   1. Cost the homepage its load. Each embed is an iframe, and this section sits
      far below the fold behind a WebGL hero. Nothing is requested until the
      section is actually approaching the viewport — see the observer below.
   Captions are deliberately NOT requested (no data-instgrm-captioned): a long
   caption can double a card's height, and the wall is here for the pictures —
   the caption is one tap away on Instagram itself.

   2. Leave a hole when it fails. Ad blockers eat embed.js, and a deleted post
      renders nothing at all. Every card therefore ships with real content
      inside the blockquote: if the script never runs, that content is what the
      visitor sees, and it links to the post. Instagram's script replaces the
      children only once it has something better to show.
   ───────────────────────────────────────────────────────────────────────── */
import { useEffect, useRef, useState } from "react";
import { Words, RevealEl } from "./Words";
import { IG_HANDLE, IG_PROFILE_URL, permalinkOf, postUrlOf } from "@/lib/instagram";

const EMBED_SRC = "https://www.instagram.com/embed.js";

// How far ahead of the viewport the embeds start loading. Roughly one screen,
// so they are rendered by the time the section arrives without being fetched
// for a visitor who never scrolls that far.
const PRELOAD_MARGIN = "600px";

/* embed.js is a singleton: a second <script> tag re-runs it and it re-processes
   every blockquote on the page. Track the one load across mounts. */
let scriptPromise = null;

function loadEmbedScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.instgrm?.Embeds) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${EMBED_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = EMBED_SRC;
    script.async = true;
    script.onload = resolve;
    // A blocked script rejects, which is what flips the section to its fallback
    // rather than leaving eight empty boxes on the page.
    script.onerror = () => reject(new Error("instagram embed.js blocked"));
    document.body.appendChild(script);
  }).catch((err) => {
    scriptPromise = null;
    throw err;
  });

  return scriptPromise;
}

export default function InstagramFeed({ posts = [], handle = IG_HANDLE }) {
  const sectionRef = useRef(null);
  const [armed, setArmed] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const shortcodes = posts.filter(Boolean);

  /* Arm on approach. Without IntersectionObserver (very old browsers) arm
     immediately — a heavier page beats a blank section. */
  useEffect(() => {
    if (!shortcodes.length) return undefined;
    const node = sectionRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setArmed(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setArmed(true);
          observer.disconnect();
        }
      },
      { rootMargin: PRELOAD_MARGIN }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [shortcodes.length]);

  /* Render the blockquotes once armed, and again whenever the list changes.
     process() is idempotent — it skips blockquotes it has already converted. */
  useEffect(() => {
    if (!armed || !shortcodes.length) return;
    let cancelled = false;

    loadEmbedScript()
      .then(() => {
        if (!cancelled) window.instgrm?.Embeds?.process();
      })
      .catch(() => {
        if (!cancelled) setBlocked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [armed, shortcodes.join(",")]);

  if (!shortcodes.length) return null;

  return (
    <section className="dn-sec dn-ig" id="dn-ig" ref={sectionRef}>
      <div className="dn-ig__inner">
        <RevealEl className="dn-ig__head">
          <span className="eyebrow">
            <Words as="span" preset="eyebrow">@{handle}</Words>
          </span>
          <h2 className="dn-ig__title">
            <Words as="span" preset="heading">
              Join our Instagram <em>community</em>
            </Words>
          </h2>
          <p className="dn-lead dn-ig__lead">
            <Words as="span" preset="body">
              Exercises you can try at home, recovery stories, and a look inside the studio.
            </Words>
          </p>
          <a
            href={IG_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-gold dn-ig__cta"
          >
            Follow @{handle} <span className="arw">→</span>
          </a>
        </RevealEl>

        {blocked ? (
          <p className="dn-ig__blocked">
            Instagram&rsquo;s embeds could not load — a browser extension is most likely blocking
            them.{" "}
            <a href={IG_PROFILE_URL} target="_blank" rel="noopener noreferrer">
              Open the profile on Instagram
            </a>
            .
          </p>
        ) : null}

        <div className="dn-ig__grid" aria-label={`Recent posts from @${handle}`}>
          {shortcodes.map((shortcode, i) => (
            <div className="dn-ig__cell" key={shortcode} data-stagger={i % 2 === 0 ? "up" : "down"}>
              {armed ? (
                <blockquote
                  className="instagram-media"
                  data-instgrm-permalink={permalinkOf(shortcode)}
                  data-instgrm-version="14"
                >
                  {/* Replaced by Instagram once embed.js runs. Until then — and
                      forever, if it is blocked — this is the card. */}
                  <a href={postUrlOf(shortcode)} target="_blank" rel="noopener noreferrer">
                    View this post on Instagram
                  </a>
                </blockquote>
              ) : (
                // Pre-arm placeholder. It holds the row height so arming the
                // section doesn't jolt the page, and it is a working link.
                <a
                  className="dn-ig__ghost"
                  href={postUrlOf(shortcode)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="dn-ig__ghost-mark" aria-hidden="true">◎</span>
                  <span className="dn-ig__ghost-label">View on Instagram</span>
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
