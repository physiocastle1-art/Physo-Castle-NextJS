import { Card, Empty } from "./ui";
import { LineChart, ChartLegend, CHART_COLORS } from "./Charts";
import { painSeries, romSeries, mmtSeries, progressHeadline } from "@/lib/progress";
import { formatDate } from "@/lib/format";

/* The patient-facing half of the record: proof that something is changing.

   Every number here was already being recorded on visits and assessments — this
   only draws it. Which is the point: the physiotherapist doesn't do extra
   paperwork to get a chart to show the patient, or the referring doctor. */

// Charting every measured movement turns the page into a wall. The series are
// already sorted by how much was gained, so the top few are the interesting ones.
const MAX_ROM_CHARTS = 4;

export default function ProgressCharts({ sessions = [], assessments = [] }) {
  const pain = painSeries(sessions, assessments);
  const rom = romSeries(assessments);
  const mmt = mmtSeries(assessments);
  const headline = progressHeadline(pain);

  const nothingYet = pain.length < 2 && !rom.length && !mmt.length;

  if (nothingYet) {
    return (
      <Card title="Progress" subtitle="Pain, range of movement and strength over time">
        <Empty
          icon="📈"
          title="Not enough readings to chart yet"
          hint="Record a pain score on each visit, or add a second assessment, and the trend appears here."
        />
      </Card>
    );
  }

  return (
    <Card
      title="Progress"
      subtitle={
        headline
          ? headline.direction === "better"
            ? `Pain down ${headline.change} points across ${headline.readings} readings — ${headline.from}/10 to ${headline.to}/10`
            : headline.direction === "worse"
              ? `Pain up ${Math.abs(headline.change)} points — ${headline.from}/10 to ${headline.to}/10`
              : `Pain unchanged at ${headline.to}/10 across ${headline.readings} readings`
          : "Pain, range of movement and strength over time"
      }
    >
      <div className="adm-stack">
        {pain.length >= 2 ? (
          <section>
            <h3 className="adm-chart-title">Pain score</h3>
            <LineChart
              series={[{ label: "Pain (0–10)", color: CHART_COLORS.pain, points: pain }]}
              yMin={0}
              yMax={10}
              yTicks={5}
              formatY={(v) => String(Math.round(v))}
              formatX={(at) => formatDate(new Date(at))}
            />
            <p className="adm-chart-note">
              Lower is better. Readings come from the pain score on each visit and the VAS on any
              assessment recorded the same day.
            </p>
          </section>
        ) : null}

        {rom.slice(0, MAX_ROM_CHARTS).map((entry) => (
          <section key={entry.key}>
            <h3 className="adm-chart-title">
              {entry.label}
              <span className={`adm-chart-delta ${entry.gained >= 0 ? "up" : "down"}`}>
                {entry.gained >= 0 ? "+" : ""}
                {entry.gained}°
                {entry.percentOfNormal > 0 ? ` · ${entry.percentOfNormal}% of normal` : ""}
              </span>
            </h3>
            <LineChart
              series={[{ label: entry.label, color: CHART_COLORS.rom, points: entry.points }]}
              yMin={0}
              yMax={Math.max(entry.normal, ...entry.points.map((p) => p.value)) * 1.1}
              yTicks={4}
              formatY={(v) => `${Math.round(v)}°`}
              formatX={(at) => formatDate(new Date(at))}
              reference={entry.normal || null}
            />
          </section>
        ))}

        {rom.length > MAX_ROM_CHARTS ? (
          <p className="adm-chart-note">
            {rom.length - MAX_ROM_CHARTS} more measured movement
            {rom.length - MAX_ROM_CHARTS === 1 ? "" : "s"} not charted — see the assessments below.
          </p>
        ) : null}

        {mmt.length ? (
          <section>
            <h3 className="adm-chart-title">Muscle strength (Oxford grade)</h3>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Muscle group</th>
                    <th className="shrink">First</th>
                    <th className="shrink">Latest</th>
                    <th className="shrink">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {mmt.map((entry) => {
                    const change = entry.last.value - entry.first.value;
                    return (
                      <tr key={entry.key}>
                        <td>{entry.label}</td>
                        <td className="adm-mono shrink">{entry.first.grade}</td>
                        <td className="adm-mono shrink">{entry.last.grade}</td>
                        <td className="shrink">
                          <span className={`adm-chart-delta ${change >= 0 ? "up" : "down"}`}>
                            {change > 0 ? "+" : ""}
                            {Math.round(change * 10) / 10}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <ChartLegend
          items={[
            { label: "Pain", color: CHART_COLORS.pain },
            ...(rom.length ? [{ label: "Range of movement", color: CHART_COLORS.rom }] : []),
          ]}
        />
      </div>
    </Card>
  );
}
