/* Turning the clinical record into the three lines a patient understands:
   pain going down, range going up, strength going up.

   All of it is derived from what is already stored on sessions and assessments
   — nothing new is written to draw a chart. Pure module, so the chart component
   and any server page compute the identical series. */

const asTime = (value) => {
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
};

/* ------------------------------------------------------------------ pain */

/* Pain is recorded in two places: a quick 0–10 on the visit itself, and the VAS
   inside a formal assessment. Both are the same scale and both belong on the
   same line — an assessment on the day of a visit is the more considered
   number, so it wins when the two fall together. */
export function painSeries(sessions = [], assessments = []) {
  const points = [];

  for (const s of sessions) {
    if (s.painScore == null) continue;
    if (s.status === "cancelled" || s.status === "no_show") continue;
    const at = asTime(s.scheduledAt);
    if (at == null) continue;
    points.push({ at, value: Number(s.painScore), source: "session", label: `Visit #${s.number}` });
  }

  for (const a of assessments) {
    const value = Number(a?.objective?.painVAS);
    if (!Number.isFinite(value) || value <= 0) continue;
    const at = asTime(a.date);
    if (at == null) continue;
    points.push({ at, value, source: "assessment", label: "Assessment" });
  }

  const byDay = new Map();
  for (const point of points.sort((a, b) => a.at - b.at)) {
    const day = new Date(point.at).toISOString().slice(0, 10);
    const existing = byDay.get(day);
    if (!existing || (point.source === "assessment" && existing.source === "session")) {
      byDay.set(day, point);
    }
  }

  return [...byDay.values()].sort((a, b) => a.at - b.at);
}

/* ------------------------------------------------------------------- ROM */

/* One line per joint + movement, each carrying the normal value it is being
   measured against. Only movements measured more than once are worth charting;
   a single reading is a number, not a trend. */
export function romSeries(assessments = []) {
  const groups = new Map();

  for (const a of assessments) {
    const at = asTime(a.date);
    if (at == null) continue;

    for (const row of a?.objective?.rom || []) {
      const joint = String(row.joint || "").trim();
      const movement = String(row.movement || "").trim();
      const degrees = Number(row.degrees);
      if (!joint || !Number.isFinite(degrees) || degrees <= 0) continue;

      const key = `${joint.toLowerCase()}|${movement.toLowerCase()}`;
      const entry = groups.get(key) || {
        key,
        label: movement ? `${joint} — ${movement}` : joint,
        normal: 0,
        points: [],
      };

      const normal = Number(row.normalDegrees);
      if (Number.isFinite(normal) && normal > entry.normal) entry.normal = normal;

      entry.points.push({ at, value: degrees });
      groups.set(key, entry);
    }
  }

  return [...groups.values()]
    .map((entry) => ({ ...entry, points: entry.points.sort((a, b) => a.at - b.at) }))
    .filter((entry) => entry.points.length >= 2)
    .map((entry) => {
      const first = entry.points[0].value;
      const last = entry.points[entry.points.length - 1].value;
      return {
        ...entry,
        gained: Math.round(last - first),
        percentOfNormal: entry.normal > 0 ? Math.min(100, Math.round((last / entry.normal) * 100)) : 0,
      };
    })
    .sort((a, b) => b.gained - a.gained);
}

/* ------------------------------------------------------------------- MMT */

/* Oxford grades are written "4/5", sometimes with a plus or minus. Charting
   them needs a number, and a third of a grade is the conventional reading of
   those signs. */
export function gradeToNumber(grade) {
  const m = /^\s*([0-5])\s*([+-])?\s*(?:\/\s*5)?\s*$/.exec(String(grade || ""));
  if (!m) return null;
  const base = Number(m[1]);
  if (m[2] === "+") return Math.min(5, base + 1 / 3);
  if (m[2] === "-") return Math.max(0, base - 1 / 3);
  return base;
}

export function mmtSeries(assessments = []) {
  const groups = new Map();

  for (const a of assessments) {
    const at = asTime(a.date);
    if (at == null) continue;

    for (const row of a?.objective?.mmt || []) {
      const muscle = String(row.muscleGroup || "").trim();
      const value = gradeToNumber(row.grade);
      if (!muscle || value == null) continue;

      const key = muscle.toLowerCase();
      const entry = groups.get(key) || { key, label: muscle, points: [] };
      entry.points.push({ at, value, grade: row.grade });
      groups.set(key, entry);
    }
  }

  return [...groups.values()]
    .map((entry) => ({ ...entry, points: entry.points.sort((a, b) => a.at - b.at) }))
    .filter((entry) => entry.points.length >= 2)
    .map((entry) => ({
      ...entry,
      first: entry.points[0],
      last: entry.points[entry.points.length - 1],
    }));
}

/* --------------------------------------------------------------- summary */

/* The one sentence to put above the charts. Improvement in pain is a fall, so
   the sign is deliberately flipped when reporting it. */
export function progressHeadline(pain) {
  if (pain.length < 2) return null;

  const first = pain[0];
  const last = pain[pain.length - 1];
  const change = first.value - last.value;

  return {
    from: first.value,
    to: last.value,
    change,
    readings: pain.length,
    direction: change > 0 ? "better" : change < 0 ? "worse" : "unchanged",
  };
}
