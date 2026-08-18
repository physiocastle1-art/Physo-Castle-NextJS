"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Empty } from "./ui";
import { formatDate } from "@/lib/format";

const VAS_LABELS = [
  "0 - No Pain",
  "1 - Mild",
  "2 - Minor",
  "3 - Noticeable",
  "4 - Moderate",
  "5 - Distracting",
  "6 - Severe",
  "7 - Unmanageable",
  "8 - Intense",
  "9 - Excruciating",
  "10 - Worst Possible",
];

export default function AssessmentManager({ patientId, assessments = [], canDelete = false }) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [subjective, setSubjective] = useState("");
  const [painVAS, setPainVAS] = useState(3);
  const [postureGaitNotes, setPostureGaitNotes] = useState("");
  const [assessmentText, setAssessmentText] = useState("");
  const [planText, setPlanText] = useState("");

  // Dynamic tables
  const [rom, setRom] = useState([
    { joint: "Knee", movement: "Flexion", degrees: 110, normalDegrees: 135, notes: "" },
  ]);
  const [mmt, setMmt] = useState([
    { muscleGroup: "Quadriceps", grade: "4/5" },
  ]);
  const [specialTests, setSpecialTests] = useState([
    { name: "Lachman Test", result: "Negative" },
  ]);

  const openNewModal = () => {
    setEditingId(null);
    setChiefComplaint("");
    setSubjective("");
    setPainVAS(3);
    setPostureGaitNotes("");
    setAssessmentText("");
    setPlanText("");
    setRom([{ joint: "", movement: "", degrees: 90, normalDegrees: 180, notes: "" }]);
    setMmt([{ muscleGroup: "", grade: "5/5" }]);
    setSpecialTests([{ name: "", result: "Negative" }]);
    setError("");
    setShowModal(true);
  };

  const openEditModal = (a) => {
    setEditingId(a._id);
    setChiefComplaint(a.chiefComplaint || "");
    setSubjective(a.subjective || "");
    setPainVAS(a.objective?.painVAS ?? 0);
    setPostureGaitNotes(a.objective?.postureGaitNotes || "");
    setAssessmentText(a.assessment || "");
    setPlanText(a.plan || "");
    setRom(a.objective?.rom?.length ? a.objective.rom : []);
    setMmt(a.objective?.mmt?.length ? a.objective.mmt : []);
    setSpecialTests(a.objective?.specialTests?.length ? a.objective.specialTests : []);
    setError("");
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const payload = {
      chiefComplaint,
      subjective,
      painVAS,
      rom: rom.filter((r) => r.joint.trim() !== ""),
      mmt: mmt.filter((m) => m.muscleGroup.trim() !== ""),
      specialTests: specialTests.filter((s) => s.name.trim() !== ""),
      postureGaitNotes,
      assessment: assessmentText,
      plan: planText,
    };

    try {
      const url = editingId
        ? `/api/admin/patients/${patientId}/assessments/${editingId}`
        : `/api/admin/patients/${patientId}/assessments`;

      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save assessment.");

      setShowModal(false);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this SOAP assessment note?")) return;
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/assessments/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete assessment.");
      router.refresh();
    } catch (err) {
      alert(err.message);
    }
  };

  // ROM Handlers
  const addRomRow = () => setRom([...rom, { joint: "", movement: "", degrees: 0, normalDegrees: 180, notes: "" }]);
  const removeRomRow = (i) => setRom(rom.filter((_, idx) => idx !== i));
  const updateRomRow = (i, field, val) => {
    const updated = [...rom];
    updated[i][field] = val;
    setRom(updated);
  };

  // MMT Handlers
  const addMmtRow = () => setMmt([...mmt, { muscleGroup: "", grade: "5/5" }]);
  const removeMmtRow = (i) => setMmt(mmt.filter((_, idx) => idx !== i));
  const updateMmtRow = (i, field, val) => {
    const updated = [...mmt];
    updated[i][field] = val;
    setMmt(updated);
  };

  // Special Test Handlers
  const addTestRow = () => setSpecialTests([...specialTests, { name: "", result: "Negative" }]);
  const removeTestRow = (i) => setSpecialTests(specialTests.filter((_, idx) => idx !== i));
  const updateTestRow = (i, field, val) => {
    const updated = [...specialTests];
    updated[i][field] = val;
    setSpecialTests(updated);
  };

  return (
    <Card
      title="Clinical Assessments & SOAP Notes"
      subtitle="Physiotherapy objective evaluation & progress notes"
      action={
        <button className="adm-btn adm-btn-primary adm-btn-sm" onClick={openNewModal}>
          + Add SOAP Note
        </button>
      }
    >
      {assessments.length === 0 ? (
        <Empty
          icon="📋"
          title="No clinical assessments recorded"
          hint="Click '+ Add SOAP Note' to log your initial evaluation or follow-up notes."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {assessments.map((a) => (
            <div
              key={a._id}
              style={{
                border: "1px solid var(--adm-border)",
                borderRadius: "8px",
                padding: "16px",
                backgroundColor: "var(--adm-surface-raised, #fff)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid var(--adm-border)",
                  paddingBottom: "10px",
                  marginBottom: "12px",
                }}
              >
                <div>
                  <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                    Assessment — {formatDate(a.date)}
                  </span>
                  {a.chiefComplaint ? (
                    <span style={{ marginLeft: "12px", color: "var(--adm-muted)", fontSize: "0.85rem" }}>
                      Chief Complaint: {a.chiefComplaint}
                    </span>
                  ) : null}
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => openEditModal(a)}>
                    Edit
                  </button>
                  {canDelete ? (
                    <button
                      className="adm-btn adm-btn-ghost adm-btn-sm"
                      style={{ color: "#dc2626" }}
                      onClick={() => handleDelete(a._id)}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="adm-grid cols-2" style={{ gap: "12px", fontSize: "0.88rem" }}>
                <div>
                  <p style={{ fontWeight: 600, color: "var(--gold)" }}>Subjective (S)</p>
                  <p style={{ color: "var(--adm-muted)", whiteSpace: "pre-wrap" }}>
                    {a.subjective || "No notes"}
                  </p>
                </div>

                <div>
                  <p style={{ fontWeight: 600, color: "var(--gold)" }}>Objective (O)</p>
                  <p>
                    <b>Pain VAS Score:</b>{" "}
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        background: a.objective?.painVAS > 5 ? "#fee2e2" : "#dcfce7",
                        color: a.objective?.painVAS > 5 ? "#991b1b" : "#166534",
                        fontWeight: 700,
                      }}
                    >
                      {a.objective?.painVAS ?? 0} / 10
                    </span>
                  </p>

                  {a.objective?.rom?.length ? (
                    <div style={{ marginTop: "6px" }}>
                      <b>Range of Motion:</b>
                      <ul style={{ paddingLeft: "16px", margin: "4px 0" }}>
                        {a.objective.rom.map((r, i) => (
                          <li key={i}>
                            {r.joint} {r.movement}: {r.degrees}° / {r.normalDegrees}°{" "}
                            {r.notes ? `(${r.notes})` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {a.objective?.mmt?.length ? (
                    <div style={{ marginTop: "6px" }}>
                      <b>Muscle Strength (MMT):</b>
                      <ul style={{ paddingLeft: "16px", margin: "4px 0" }}>
                        {a.objective.mmt.map((m, i) => (
                          <li key={i}>
                            {m.muscleGroup}: <b>{m.grade}</b>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>

                <div>
                  <p style={{ fontWeight: 600, color: "var(--gold)" }}>Assessment (A)</p>
                  <p style={{ color: "var(--adm-muted)", whiteSpace: "pre-wrap" }}>
                    {a.assessment || "Clinical impression pending"}
                  </p>
                </div>

                <div>
                  <p style={{ fontWeight: 600, color: "var(--gold)" }}>Plan (P)</p>
                  <p style={{ color: "var(--adm-muted)", whiteSpace: "pre-wrap" }}>
                    {a.plan || "Treatment plan pending"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for adding/editing SOAP assessment */}
      {showModal ? (
        <div className="adm-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="adm-modal" style={{ maxWidth: "700px" }} onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? "Edit SOAP Note" : "New SOAP Note / Clinical Assessment"}</h3>

            {error ? <div className="adm-alert adm-alert-error" style={{ margin: "12px 0" }}>{error}</div> : null}

            <form onSubmit={handleSave} style={{ marginTop: "16px" }}>
              <div className="adm-field">
                <label>Chief Complaint</label>
                <input
                  type="text"
                  placeholder="e.g. Left Knee Pain post-ACL reconstruction, 3 weeks"
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                />
              </div>

              <div className="adm-field" style={{ marginTop: "12px" }}>
                <label>Subjective Notes (S)</label>
                <textarea
                  rows={2}
                  placeholder="Patient reports pain when climbing stairs, stiffness in morning..."
                  value={subjective}
                  onChange={(e) => setSubjective(e.target.value)}
                />
              </div>

              <div style={{ borderTop: "1px solid var(--adm-border)", paddingTop: "12px", marginTop: "16px" }}>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "8px" }}>
                  Objective Evaluation (O)
                </h4>

                <div className="adm-field">
                  <label>
                    Pain VAS Score: <b>{painVAS} / 10</b> ({VAS_LABELS[painVAS]})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={painVAS}
                    onChange={(e) => setPainVAS(Number(e.target.value))}
                    style={{ width: "100%", margin: "8px 0" }}
                  />
                </div>

                {/* Range of Motion */}
                <div style={{ marginTop: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>Range of Motion (ROM)</label>
                    <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={addRomRow}>
                      + Add ROM Joint
                    </button>
                  </div>
                  {rom.map((r, i) => (
                    <div key={i} style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                      <input
                        type="text"
                        placeholder="Joint (Knee)"
                        value={r.joint}
                        onChange={(e) => updateRomRow(i, "joint", e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <input
                        type="text"
                        placeholder="Movement (Flexion)"
                        value={r.movement}
                        onChange={(e) => updateRomRow(i, "movement", e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <input
                        type="number"
                        placeholder="Deg°"
                        value={r.degrees}
                        onChange={(e) => updateRomRow(i, "degrees", Number(e.target.value))}
                        style={{ width: "70px" }}
                      />
                      <button
                        type="button"
                        className="adm-btn adm-btn-ghost adm-btn-sm"
                        style={{ color: "#dc2626" }}
                        onClick={() => removeRomRow(i)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {/* MMT */}
                <div style={{ marginTop: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>Manual Muscle Testing (MMT)</label>
                    <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={addMmtRow}>
                      + Add Muscle Group
                    </button>
                  </div>
                  {mmt.map((m, i) => (
                    <div key={i} style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                      <input
                        type="text"
                        placeholder="Muscle (Quadriceps)"
                        value={m.muscleGroup}
                        onChange={(e) => updateMmtRow(i, "muscleGroup", e.target.value)}
                        style={{ flex: 2 }}
                      />
                      <select
                        value={m.grade}
                        onChange={(e) => updateMmtRow(i, "grade", e.target.value)}
                        style={{ flex: 1 }}
                      >
                        <option value="5/5">5/5 - Normal</option>
                        <option value="4/5">4/5 - Good</option>
                        <option value="3/5">3/5 - Fair</option>
                        <option value="2/5">2/5 - Poor</option>
                        <option value="1/5">1/5 - Trace</option>
                        <option value="0/5">0/5 - Zero</option>
                      </select>
                      <button
                        type="button"
                        className="adm-btn adm-btn-ghost adm-btn-sm"
                        style={{ color: "#dc2626" }}
                        onClick={() => removeMmtRow(i)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="adm-field" style={{ marginTop: "16px" }}>
                <label>Assessment &amp; Clinical Impression (A)</label>
                <textarea
                  rows={2}
                  placeholder="Functional diagnosis, prognosis, recovery trajectory..."
                  value={assessmentText}
                  onChange={(e) => setAssessmentText(e.target.value)}
                />
              </div>

              <div className="adm-field" style={{ marginTop: "12px" }}>
                <label>Plan of Care &amp; Home Exercises (P)</label>
                <textarea
                  rows={2}
                  placeholder="Ultrasound therapy + Quad sets + Straight Leg Raises 3x10 daily..."
                  value={planText}
                  onChange={(e) => setPlanText(e.target.value)}
                />
              </div>

              <div className="adm-modal-actions" style={{ marginTop: "20px" }}>
                <button
                  type="button"
                  className="adm-btn adm-btn-ghost"
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button type="submit" className="adm-btn adm-btn-primary" disabled={loading}>
                  {loading ? "Saving..." : "Save SOAP Assessment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
