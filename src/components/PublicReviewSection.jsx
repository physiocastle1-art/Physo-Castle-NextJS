"use client";
import { useState } from "react";

/* The approved reviews are rendered on the SERVER and handed down as
   `initialReviews` — this component no longer fetches them.

   Why that matters: the old useEffect fired only after React had hydrated, so
   the section was empty on first paint, the list was invisible to search
   engines and to anyone with JS disabled, and every visitor paid a database
   round trip that returns the same rows for all of them. The page now ships
   the reviews in the HTML, cached and tag-invalidated (see lib/public-data.js).

   Submitting a review stays here, because it is a mutation: it POSTs to the
   rate-limited route and the new review lands as "pending", so it correctly
   does not appear in this list until someone approves it. */
export default function PublicReviewSection({ initialReviews = [] }) {
  const reviews = initialReviews;
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentMsg, setSentMsg] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSentMsg("");

    try {
      const res = await fetch("/api/public/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role, rating, text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit review.");

      setSentMsg(data.message || "Thank you! Your review has been submitted for approval.");
      setName("");
      setRole("");
      setText("");
      setTimeout(() => setShowModal(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: "32px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <span className="eyebrow">Community &amp; Recovery</span>
          <h2 className="title" style={{ fontSize: "2rem", marginTop: 4 }}>
            Patient <em>Reviews</em>
          </h2>
        </div>
        <button
          type="button"
          className="btn btn-gold"
          onClick={() => {
            setSentMsg("");
            setError("");
            setShowModal(true);
          }}
        >
          ✍️ Leave a Review
        </button>
      </div>

      {reviews.length > 0 ? (
        <div className="tcols" style={{ marginBottom: "32px" }}>
          {reviews.map((r) => (
            <div className="tcard" key={r._id}>
              <div className="stars">{"★".repeat(r.rating)}</div>
              <p>&ldquo;{r.text}&rdquo;</p>
              <div className="who">
                <div className="av">{r.name ? r.name[0].toUpperCase() : "P"}</div>
                <div>
                  <b>{r.name}</b>
                  <small>{r.role || "Verified Patient"}</small>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Review Submission Modal */}
      {showModal ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(15, 23, 42, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              maxWidth: "500px",
              width: "100%",
              padding: "32px",
              color: "#0f172a",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: "var(--serif)", fontSize: "1.8rem", marginBottom: "8px" }}>
              Leave a Patient Review
            </h3>
            <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "20px" }}>
              Share your healing experience with Dr. Riddhi Shah and Physio Castle.
            </p>

            {sentMsg ? (
              <div style={{ background: "#dcfce7", color: "#166534", padding: "16px", borderRadius: "8px", fontWeight: 600 }}>
                {sentMsg}
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {error ? <div style={{ color: "#dc2626", fontSize: "0.88rem" }}>{error}</div> : null}

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ananya Patel"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                    Treatment / Condition
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Back Pain Rehab, Home Visit"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                    Rating *
                  </label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                  >
                    <option value="5">★★★★★ (5 Stars - Excellent)</option>
                    <option value="4">★★★★☆ (4 Stars - Very Good)</option>
                    <option value="3">★★★☆☆ (3 Stars - Average)</option>
                    <option value="2">★★☆☆☆ (2 Stars - Below Average)</option>
                    <option value="1">★☆☆☆☆ (1 Star - Poor)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                    Your Review *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Tell us about your recovery journey and how you felt..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                  />
                </div>

                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "12px" }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowModal(false)}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-gold" disabled={loading}>
                    {loading ? "Submitting..." : "Submit Review"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
