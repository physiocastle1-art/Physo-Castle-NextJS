"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Empty } from "./ui";
import InstagramManager from "./InstagramManager";
import { formatDate } from "@/lib/format";

const DEFAULT_SERVICES = [
  { slug: "ortho", name: "Orthopaedic Rehabilitation", heading: "Recover strength, mobility and confidence after injury or surgery.", pricePerSession: 800, packagePrice: 3500 },
  { slug: "neuro", name: "Neurological Rehabilitation", heading: "Rebuilding movement, balance and independence through targeted neuro-rehabilitation.", pricePerSession: 1000, packagePrice: 4500 },
  { slug: "cardio", name: "Cardiorespiratory Rehabilitation", heading: "Breathe easier and rebuild endurance after illness or cardiac and respiratory conditions.", pricePerSession: 800, packagePrice: 3500 },
  { slug: "women", name: "Women's Health", heading: "Specialised, compassionate physiotherapy for every phase of a woman's life.", pricePerSession: 800, packagePrice: 3500 },
  { slug: "wellness", name: "Stress & Wellness", heading: "Calm the nervous system — relaxation therapy, fitness, yoga, Zumba and Pilates.", pricePerSession: 700, packagePrice: 3000 },
];

export default function CmsManager({ reviews = [], services = [], instagram = [], canDelete = false }) {
  const router = useRouter();
  const [tab, setTab] = useState("reviews");
  const [busy, setBusy] = useState(false);

  // Service Edit Form State
  const [editingService, setEditingService] = useState(null);

  const handleReviewAction = async (id, status, featured) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, featured }),
      });
      if (!res.ok) throw new Error("Failed to update review.");
      router.refresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleReviewDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this review?")) return;
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete review.");
      router.refresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleServiceSave = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/cms/services", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingService),
      });
      if (!res.ok) throw new Error("Failed to update service details.");
      setEditingService(null);
      router.refresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  const serviceList = DEFAULT_SERVICES.map((ds) => {
    const found = services.find((s) => s.slug === ds.slug);
    return found ? { ...ds, ...found } : ds;
  });

  const pendingReviews = reviews.filter((r) => r.status === "pending");
  const approvedReviews = reviews.filter((r) => r.status === "approved");

  return (
    <div style={{ marginTop: "16px" }}>
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
        <button
          className={`adm-btn ${tab === "reviews" ? "adm-btn-primary" : "adm-btn-ghost"}`}
          onClick={() => setTab("reviews")}
        >
          💬 Patient Reviews &amp; Submissions ({pendingReviews.length} Pending)
        </button>
        <button
          className={`adm-btn ${tab === "services" ? "adm-btn-primary" : "adm-btn-ghost"}`}
          onClick={() => setTab("services")}
        >
          🏷️ Services &amp; Pricing CMS
        </button>
        <button
          className={`adm-btn ${tab === "instagram" ? "adm-btn-primary" : "adm-btn-ghost"}`}
          onClick={() => setTab("instagram")}
        >
          ◎ Instagram Feed ({instagram.filter((r) => r.active).length})
        </button>
      </div>

      {tab === "instagram" ? (
        <InstagramManager rows={instagram} canDelete={canDelete} />
      ) : tab === "reviews" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Pending Reviews Section */}
          <Card
            title={`Pending Reviews (${pendingReviews.length})`}
            subtitle="Website user submissions awaiting your approval to display on /testimonials"
          >
            {pendingReviews.length === 0 ? (
              <Empty icon="✓" title="No pending reviews" hint="All submitted patient reviews have been moderated." />
            ) : (
              <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {pendingReviews.map((r) => (
                  <div
                    key={r._id}
                    style={{
                      border: "1px solid #fde68a",
                      backgroundColor: "#fffbeb",
                      borderRadius: "8px",
                      padding: "16px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontWeight: 700 }}>
                        {r.name} <small style={{ color: "#92400e" }}>({r.role})</small>
                      </span>
                      <span style={{ color: "#b45309", fontWeight: 700 }}>{"★".repeat(r.rating)}</span>
                    </div>
                    <p style={{ fontStyle: "italic", marginBottom: "12px", color: "#451a03" }}>&ldquo;{r.text}&rdquo;</p>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className="adm-btn adm-btn-primary adm-btn-sm"
                        disabled={busy}
                        onClick={() => handleReviewAction(r._id, "approved")}
                      >
                        ✓ Approve &amp; Publish
                      </button>
                      <button
                        className="adm-btn adm-btn-ghost adm-btn-sm"
                        style={{ color: "#dc2626" }}
                        disabled={busy}
                        onClick={() => handleReviewAction(r._id, "rejected")}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Approved Reviews Section */}
          <Card title={`Approved Live Reviews (${approvedReviews.length})`} subtitle="Currently visible on your website">
            {approvedReviews.length === 0 ? (
              <Empty icon="💬" title="No published reviews yet" />
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Patient Name</th>
                      <th>Rating</th>
                      <th>Review Text</th>
                      <th>Date</th>
                      <th className="shrink">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedReviews.map((r) => (
                      <tr key={r._id}>
                        <td style={{ fontWeight: 600 }}>{r.name}</td>
                        <td style={{ color: "var(--gold)" }}>{"★".repeat(r.rating)}</td>
                        <td className="adm-small">&ldquo;{r.text}&rdquo;</td>
                        <td className="adm-small adm-muted">{formatDate(r.createdAt)}</td>
                        <td className="shrink">
                          <button
                            className="adm-btn adm-btn-danger adm-btn-sm"
                            onClick={() => handleReviewDelete(r._id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      ) : (
        /* Services CMS Tab */
        <Card title="Manage Services &amp; Pricing" subtitle="Update service details and package rates live on /services">
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Service Name</th>
                  <th>Heading</th>
                  <th className="num">Price / Session</th>
                  <th className="num">Package Rate</th>
                  <th className="shrink">Action</th>
                </tr>
              </thead>
              <tbody>
                {serviceList.map((s) => (
                  <tr key={s.slug}>
                    <td style={{ fontWeight: 700 }}>{s.name}</td>
                    <td className="adm-small adm-muted">{s.heading}</td>
                    <td className="num adm-mono">₹{s.pricePerSession}</td>
                    <td className="num adm-mono">₹{s.packagePrice}</td>
                    <td className="shrink">
                      <button
                        className="adm-btn adm-btn-ghost adm-btn-sm"
                        onClick={() => setEditingService(s)}
                      >
                        Edit Rate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editingService ? (
            <div className="adm-modal-backdrop" onClick={() => setEditingService(null)}>
              <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
                <h3>Edit {editingService.name} Details</h3>
                <form onSubmit={handleServiceSave} style={{ marginTop: "16px" }}>
                  <div className="adm-field">
                    <label>Headline</label>
                    <input
                      type="text"
                      value={editingService.heading || ""}
                      onChange={(e) => setEditingService({ ...editingService, heading: e.target.value })}
                    />
                  </div>
                  <div className="adm-field" style={{ marginTop: "12px" }}>
                    <label>Single Session Price (₹)</label>
                    <input
                      type="number"
                      value={editingService.pricePerSession || 0}
                      onChange={(e) => setEditingService({ ...editingService, pricePerSession: Number(e.target.value) })}
                    />
                  </div>
                  <div className="adm-field" style={{ marginTop: "12px" }}>
                    <label>Package Price (5 Sessions) (₹)</label>
                    <input
                      type="number"
                      value={editingService.packagePrice || 0}
                      onChange={(e) => setEditingService({ ...editingService, packagePrice: Number(e.target.value) })}
                    />
                  </div>
                  <div className="adm-modal-actions" style={{ marginTop: "20px" }}>
                    <button type="button" className="adm-btn adm-btn-ghost" onClick={() => setEditingService(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="adm-btn adm-btn-primary" disabled={busy}>
                      {busy ? "Saving..." : "Save Service"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}
        </Card>
      )}
    </div>
  );
}
