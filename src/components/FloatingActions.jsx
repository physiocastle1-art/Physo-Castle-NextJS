"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Chatbot from "@/components/Chatbot";

// Site-wide floating action stack: Book Appointment, WhatsApp, and a waving
// bot (video) that opens the AI assistant in a pop-up chat panel.
const WHATSAPP = "919512346056"; // +91 95123 46056 — update if the number changes

export default function FloatingActions() {
  const [chatOpen, setChatOpen] = useState(false);
  const botVideoRef = useRef(null);

  /* The bot loop is decorative and must simply run. A <video> whose autoplay is
     refused renders as a play button, which is what was showing on phones.

     Two causes, both handled here. The clip was 2 MB of 1280x720 with an audio
     track for a 58px circle, so on mobile data it had not buffered by the time
     the visitor arrived — it is now 28 KB of 192x192 with no audio. And iOS Low
     Power Mode and Android Data Saver refuse autoplay outright whatever the
     size, so playback is nudged on mount and again on the first touch, which is
     a user gesture and always permitted. The poster means the worst case is a
     still of the bot rather than an empty circle.

     The element is remounted whenever the panel closes, hence chatOpen here. */
  useEffect(() => {
    const video = botVideoRef.current;
    if (!video) return undefined;

    // Set as a property too: the attribute alone is not enough in every engine,
    // and an unmuted video is refused autoplay on every mobile browser.
    video.muted = true;

    const tryPlay = () => {
      const attempt = video.play();
      // Rejects when the policy refuses; nothing to do but leave the poster up.
      if (attempt?.catch) attempt.catch(() => {});
    };

    tryPlay();
    window.addEventListener("touchstart", tryPlay, { once: true, passive: true });
    return () => window.removeEventListener("touchstart", tryPlay);
  }, [chatOpen]);

  return (
    <>
      {chatOpen && (
        <div className="chat-pop" role="dialog" aria-label="AI assistant chat">
          <button className="chat-pop-close" aria-label="Close chat" onClick={() => setChatOpen(false)}>✕</button>
          <Chatbot />
        </div>
      )}

      <div className="fab-stack" aria-label="Quick actions">
        {/* Waving bot (video) → opens chatbot pop-up */}
        <button
          className={"fab fab-bot" + (chatOpen ? " open" : "")}
          aria-label={chatOpen ? "Close AI assistant" : "Chat with our AI assistant"}
          aria-expanded={chatOpen}
          onClick={() => setChatOpen((v) => !v)}
        >
          <span className="fab-label">{chatOpen ? "Close chat" : "Ask our AI"}</span>
          {chatOpen ? (
            <span className="fab-bot-x" aria-hidden="true">✕</span>
          ) : (
            <video
              ref={botVideoRef}
              className="fab-bot-vid"
              src="/bot-wave.mp4"
              poster="/bot-wave-poster.jpg"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              disablePictureInPicture
              aria-hidden="true"
            />
          )}
        </button>

        {/* WhatsApp */}
        <a
          href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hi Dr. Riddhi, I'd like to know more about physiotherapy.")}`}
          target="_blank" rel="noopener noreferrer"
          className="fab fab-wa" aria-label="Chat on WhatsApp"
        >
          <span className="fab-label">WhatsApp</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" width="26" height="26">
            <path fill="currentColor" d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.8 14.01c-.24.68-1.42 1.3-1.95 1.35-.5.05-.99.24-3.35-.7-2.82-1.11-4.6-3.99-4.74-4.18-.14-.19-1.14-1.52-1.14-2.9 0-1.38.72-2.06.98-2.34.24-.26.53-.33.71-.33.18 0 .36 0 .51.01.16.01.39-.06.6.46.24.58.79 2 .86 2.14.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.16-.29.37-.42.49-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.22 1.37.28.14.44.12.6-.07.16-.19.69-.8.87-1.08.18-.28.36-.23.61-.14.24.09 1.55.73 1.81.86.26.14.44.21.5.32.07.11.07.65-.17 1.33z"/>
          </svg>
        </a>

        {/* Book appointment */}
        <Link href="/contact" className="fab fab-book" aria-label="Book an appointment">
          <span className="fab-label">Book Appointment</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9h18M8 2.5v4M16 2.5v4M8.5 14l2.5 2.5 4.5-5" />
          </svg>
        </Link>
      </div>
    </>
  );
}
