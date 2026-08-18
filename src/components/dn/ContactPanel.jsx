"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import DnaInk from "./DnaInk";
import { Words } from "./Words";

export default function ContactPanel() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [wide, setWide] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setWide(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          notes: message,
          type: "Callback Request",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit request.");

      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="dn-sec dn-contact" id="dn-contact">
      {wide && <DnaInk className="dn-contact__scene" />}

      <div className="dn-contact__copy">
        <span className="eyebrow">
          <Words as="span" preset="eyebrow">
            Get in touch
          </Words>
        </span>
        <Words as="h2" preset="heading" className="title">
          Not sure where to start? <em>Ask us.</em>
        </Words>
        <Words as="p" preset="body" className="lede">
          Leave your details and we&apos;ll call you back to plan the first visit — usually the same
          working day. Prefer to book straight away? Use the full form on the contact page.
        </Words>
      </div>

      <form className="dn-form" onSubmit={handleSubmit} noValidate>
        <span className="dn-form__mark" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M15.0223 1.46977C15.3152 1.17693 15.791 1.17689 16.0838 1.46977C16.3763 1.76259 16.3763 2.23751 16.0838 2.53031C14.5974 4.01669 14.5974 6.42675 16.0838 7.91312C17.5702 9.39907 19.9795 9.39914 21.4657 7.91312C21.7585 7.62034 22.2333 7.62044 22.5262 7.91312C22.8189 8.20592 22.8198 8.68078 22.5272 8.97367C21.1685 10.3325 19.2557 10.7992 17.5155 10.376C17.6669 10.8911 17.7499 11.4359 17.7499 12C17.7498 15.1756 15.1754 17.7499 11.9999 17.75C11.4358 17.75 10.8909 17.6671 10.3758 17.5157C10.8003 19.2564 10.3329 21.1707 8.9735 22.5303C8.6808 22.8228 8.20584 22.8235 7.91295 22.5313C7.62011 22.2385 7.62022 21.7627 7.91295 21.4698C9.39891 19.9835 9.39867 17.5743 7.91295 16.0879C6.42657 14.6015 4.01651 14.6015 2.53014 16.0879C2.2374 16.3802 1.7624 16.3801 1.46959 16.0879C1.17675 15.7951 1.17686 15.3193 1.46959 15.0264C2.82903 13.6671 4.7426 13.1988 6.48326 13.6231C6.33203 13.1083 6.24987 12.5638 6.24986 12C6.24986 8.8244 8.82423 6.25004 11.9999 6.25004C12.5622 6.25005 13.1053 6.33195 13.619 6.48246C13.1952 4.74209 13.6633 2.82892 15.0223 1.46977ZM11.9999 7.75004C9.65265 7.75004 7.74986 9.65283 7.74986 12C7.74989 14.3472 9.65267 16.25 11.9999 16.25C14.347 16.25 16.2498 14.3472 16.2499 12C16.2499 9.65288 14.347 7.75013 11.9999 7.75004Z"
              fill="currentColor"
            />
          </svg>
        </span>
        <h3 className="dn-form__title">Request a call back</h3>

        {sent ? (
          <p className="dn-form__ok">
            Thank you — we&apos;ve noted your request and will call you back shortly. For an urgent
            visit,{" "}
            <a href="https://wa.me/919512346056" target="_blank" rel="noopener noreferrer">
              message us on WhatsApp
            </a>
            .
          </p>
        ) : (
          <>
            {error ? <p style={{ color: "#dc2626", fontSize: "0.86rem" }}>{error}</p> : null}
            <div className="dn-field">
              <label htmlFor="dn-name">Your name</label>
              <input
                id="dn-name"
                name="name"
                type="text"
                required
                placeholder="Name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="dn-field">
              <label htmlFor="dn-phone">Your mobile</label>
              <input
                id="dn-phone"
                name="phone"
                type="tel"
                required
                placeholder="+91"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="dn-field">
              <label htmlFor="dn-msg">Your message</label>
              <textarea
                id="dn-msg"
                name="message"
                rows={1}
                placeholder="Where does it hurt, and since when?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <p className="dn-consent">
              By submitting, you agree to our <Link href="/contact">terms</Link> and the processing of
              your personal data.
            </p>
            <button className="btn btn-gold dn-form__submit" type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send Request"}
            </button>
          </>
        )}
      </form>
    </section>
  );
}
