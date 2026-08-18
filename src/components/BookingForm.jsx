"use client";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const BODY_PARTS = ["Shoulder", "Elbow", "Wrist / Fingers", "Neck", "Upper Back", "Lower Back", "Hip", "Knee", "Ankle / Feet"];
const SLOTS = ["Morning · 8–11 am", "Midday · 11 am–1 pm", "Afternoon · 1–4 pm", "Evening · 4–7 pm", "Late evening · 7–9 pm"];
const GENDERS = ["Female", "Male", "Other", "Prefer not to say"];

export default function BookingForm() {
  /* The symptom check sends what the visitor selected here as ?parts=. Without
     this they had to find and re-enter it, having already told us once.

     Anything that is not one of BODY_PARTS — "Sciatica", "Plantar fasciitis" —
     is added to the picker as its own chip rather than dropped, so what arrives
     is exactly what they chose, still visible and still switchable off. */
  const searchParams = useSearchParams();
  const carried = useMemo(() => {
    const raw = searchParams.get("parts");
    if (!raw) return [];
    const seen = raw.split(",").map((v) => v.trim()).filter(Boolean);
    // Deduped and bounded: the value is user-editable in the address bar.
    return [...new Set(seen)].slice(0, 20).map((v) => v.slice(0, 80));
  }, [searchParams]);

  const partOptions = useMemo(
    () => [...BODY_PARTS, ...carried.filter((c) => !BODY_PARTS.includes(c))],
    [carried]
  );

  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  // Lazy initial value: whatever arrived is already ticked on first paint.
  const [parts, setParts] = useState(() => carried);
  const [bookSlots, setBookSlots] = useState([]);

  const toggle = (setter) => (val) =>
    setter((cur) => (cur.includes(val) ? cur.filter((v) => v !== val) : [...cur, val]));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          age,
          gender,
          phone,
          address,
          notes,
          parts,
          slots: bookSlots,
          type: "Appointment Booking",
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
    <div className="form-card">
      <h3 style={{ fontSize: "1.4rem", fontFamily: "var(--serif)", marginBottom: "16px", color: "var(--text)" }}>
        Book an Appointment
      </h3>

      {sent ? (
        <Ok
          title="Request received"
          msg="Thank you — we've received your booking details and will confirm your visit slot within 24 hours by call or WhatsApp."
          items={parts}
        />
      ) : (
        <form onSubmit={submit}>
          {error ? <div style={{ color: "#dc2626", fontSize: "0.88rem", marginBottom: "12px" }}>{error}</div> : null}

          <div className="grid2">
            <Field label="Name">
              <input type="text" required placeholder="Patient name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Age">
              <input type="number" min="0" max="120" required placeholder="Age" value={age} onChange={(e) => setAge(e.target.value)} />
            </Field>
          </div>

          <div className="grid2">
            <Field label="Gender">
              <select required value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="" disabled>
                  Select…
                </option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </Field>
            <Field label="Mobile No.">
              <input type="tel" required placeholder="+91" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
          </div>

          <Field label="Address">
            <input type="text" required placeholder="Flat / area / landmark, Surat" value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>

          <div className="field">
            <label>Complaint — where is the pain?</label>
            <p className="pick-hint">
              {carried.length
                ? "Carried over from your symptom check — add or remove anything."
                : "Select the area(s) troubling you."}
            </p>
            <div className="pick-grid">
              {partOptions.map((p) => (
                <button
                  type="button"
                  key={p}
                  className={"pick" + (parts.includes(p) ? " on" : "")}
                  aria-pressed={parts.includes(p)}
                  onClick={() => toggle(setParts)(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <Field label="Anything else we should know? (optional)">
            <textarea placeholder="Since when, what makes it worse, past treatment…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>

          <div className="field">
            <label>Preferred timings</label>
            <div className="slot-grid">
              {SLOTS.map((s) => (
                <label key={s} className={"slot" + (bookSlots.includes(s) ? " on" : "")}>
                  <input
                    type="checkbox"
                    checked={bookSlots.includes(s)}
                    onChange={() => toggle(setBookSlots)(s)}
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-gold"
            style={{ width: "100%", justifyContent: "center" }}
            disabled={loading}
          >
            {loading ? "Sending Lead..." : "Book appointment"} <span className="arw">→</span>
          </button>
        </form>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}
function Ok({ title, msg, items = [] }) {
  return (
    <div className="form-ok">
      <div className="ico">✓</div>
      <h3 style={{ fontSize: "1.6rem" }}>{title}</h3>
      <p className="muted mt-s">{msg}</p>
      {/* Reading back what was sent, so the visitor can see their symptom-check
          selections actually made it into the request. */}
      {items.length ? (
        <div className="form-ok-items">
          <span>We noted</span>
          <div>{items.map((i) => <b key={i}>{i}</b>)}</div>
        </div>
      ) : null}
    </div>
  );
}
