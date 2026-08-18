/* Charts drawn as plain SVG.

   No charting library: the three shapes this panel needs (a line over time, a
   grouped bar per month, a progress bar) are a few dozen lines each, and a
   dependency that ships a canvas renderer to show twelve numbers is not worth
   the download on a clinic's phone.

   Hook-free, so every chart renders on the server inside the page it belongs
   to. Hover detail comes from <title>, which the browser handles natively. */

const W = 720;

const niceCeil = (value) => {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const scaled = value / magnitude;
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return step * magnitude;
};

/* ----------------------------------------------------------- line chart */

/* `series` is [{ label, color, dashed, points: [{ at, value, label }] }] where
   `at` is a millisecond timestamp. Points are positioned by time rather than by
   index, so a three-week gap between visits looks like a three-week gap. */
export function LineChart({
  series = [],
  height = 240,
  yMin = 0,
  yMax = null,
  yTicks = 5,
  formatY = (v) => String(v),
  formatX = null,
  reference = null,
  emptyHint = "Not enough readings yet.",
}) {
  const withPoints = series.filter((s) => (s.points || []).length > 0);
  const all = withPoints.flatMap((s) => s.points);

  if (all.length < 2) {
    return <p className="adm-chart-empty">{emptyHint}</p>;
  }

  const pad = { top: 14, right: 16, bottom: 30, left: 46 };
  const plotW = W - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const xs = all.map((p) => p.at);
  const xMin = Math.min(...xs);
  const xSpan = Math.max(1, Math.max(...xs) - xMin);

  const top = yMax == null ? niceCeil(Math.max(...all.map((p) => p.value))) : yMax;
  const ySpan = Math.max(1e-6, top - yMin);

  const x = (at) => pad.left + ((at - xMin) / xSpan) * plotW;
  const y = (value) => pad.top + plotH - ((value - yMin) / ySpan) * plotH;

  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => yMin + (ySpan * i) / yTicks);

  return (
    <svg
      className="adm-chart"
      viewBox={`0 0 ${W} ${height}`}
      width="100%"
      height={height}
      role="img"
      aria-label={withPoints.map((s) => s.label).join(", ")}
    >
      {ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={pad.left}
            x2={W - pad.right}
            y1={y(tick)}
            y2={y(tick)}
            className="adm-chart-grid"
          />
          <text x={pad.left - 8} y={y(tick) + 4} className="adm-chart-axis" textAnchor="end">
            {formatY(tick)}
          </text>
        </g>
      ))}

      {reference != null && reference > yMin && reference <= top ? (
        <g>
          <line
            x1={pad.left}
            x2={W - pad.right}
            y1={y(reference)}
            y2={y(reference)}
            className="adm-chart-ref"
          />
          <text x={W - pad.right} y={y(reference) - 6} className="adm-chart-axis" textAnchor="end">
            normal {formatY(reference)}
          </text>
        </g>
      ) : null}

      {withPoints.map((s, i) => {
        const path = s.points
          .map((p, index) => `${index === 0 ? "M" : "L"} ${x(p.at).toFixed(1)} ${y(p.value).toFixed(1)}`)
          .join(" ");

        return (
          <g key={s.label || i}>
            <path
              d={path}
              fill="none"
              className="adm-chart-line"
              style={{ stroke: s.color }}
              strokeDasharray={s.dashed ? "5 4" : undefined}
            />
            {s.points.map((p) => (
              <circle
                key={`${p.at}-${p.value}`}
                cx={x(p.at)}
                cy={y(p.value)}
                r="3.5"
                className="adm-chart-dot"
                style={{ fill: s.color }}
              >
                <title>
                  {[s.label, p.label, formatY(p.value)].filter(Boolean).join(" · ")}
                </title>
              </circle>
            ))}
          </g>
        );
      })}

      {formatX ? (
        <>
          <text x={pad.left} y={height - 8} className="adm-chart-axis" textAnchor="start">
            {formatX(xMin)}
          </text>
          <text x={W - pad.right} y={height - 8} className="adm-chart-axis" textAnchor="end">
            {formatX(xMin + xSpan)}
          </text>
        </>
      ) : null}
    </svg>
  );
}

/* ------------------------------------------------------------ bar chart */

/* Grouped bars, one group per row. `bars` names the numeric keys to draw:
   [{ key: "revenue", label: "Collected", color: "…" }].

   Negative values are supported — a loss-making month has to be able to point
   downwards, otherwise the chart quietly lies about it. */
export function BarChart({
  rows = [],
  bars = [],
  height = 240,
  formatValue = (v) => String(v),
  formatRow = (row) => row.label,
}) {
  if (!rows.length) return <p className="adm-chart-empty">Nothing to chart yet.</p>;

  const pad = { top: 14, right: 12, bottom: 34, left: 58 };
  const plotW = W - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const values = rows.flatMap((row) => bars.map((b) => Number(row[b.key]) || 0));
  const top = niceCeil(Math.max(1, ...values.map((v) => Math.abs(v))));
  const hasNegative = values.some((v) => v < 0);

  const yMin = hasNegative ? -top : 0;
  const ySpan = top - yMin;
  const y = (value) => pad.top + plotH - ((value - yMin) / ySpan) * plotH;
  const zero = y(0);

  const groupW = plotW / rows.length;
  const barW = Math.max(3, (groupW * 0.66) / bars.length);

  // Label every other month once the axis gets crowded, so twelve months still
  // read on a phone.
  const labelEvery = rows.length > 8 ? 2 : 1;

  return (
    <svg
      className="adm-chart"
      viewBox={`0 0 ${W} ${height}`}
      width="100%"
      height={height}
      role="img"
      aria-label={bars.map((b) => b.label).join(", ")}
    >
      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const value = yMin + ySpan * f;
        return (
          <g key={f}>
            <line x1={pad.left} x2={W - pad.right} y1={y(value)} y2={y(value)} className="adm-chart-grid" />
            <text x={pad.left - 8} y={y(value) + 4} className="adm-chart-axis" textAnchor="end">
              {formatValue(value)}
            </text>
          </g>
        );
      })}

      <line x1={pad.left} x2={W - pad.right} y1={zero} y2={zero} className="adm-chart-zero" />

      {rows.map((row, i) => {
        const groupX = pad.left + groupW * i;
        const startX = groupX + (groupW - barW * bars.length) / 2;

        return (
          <g key={row.key || i}>
            {bars.map((bar, j) => {
              const value = Number(row[bar.key]) || 0;
              const barY = value >= 0 ? y(value) : zero;
              const barH = Math.max(1, Math.abs(y(value) - zero));

              return (
                <rect
                  key={bar.key}
                  x={startX + barW * j}
                  y={barY}
                  width={barW - 1}
                  height={barH}
                  rx="2"
                  style={{ fill: bar.color }}
                >
                  <title>{`${formatRow(row)} · ${bar.label}: ${formatValue(value)}`}</title>
                </rect>
              );
            })}

            {i % labelEvery === 0 ? (
              <text
                x={groupX + groupW / 2}
                y={height - 10}
                className="adm-chart-axis"
                textAnchor="middle"
              >
                {formatRow(row)}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

export function ChartLegend({ items = [] }) {
  if (!items.length) return null;
  return (
    <ul className="adm-chart-legend">
      {items.map((item) => (
        <li key={item.label}>
          <span className="adm-chart-swatch" style={{ background: item.color }} aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/* A labelled proportion bar — used where a full chart would be overkill. */
export function RatioBar({ label, value, total, tone = "green", formatValue = (v) => v }) {
  const percent = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="adm-ratio">
      <div className="adm-ratio-head">
        <span>{label}</span>
        <strong>{formatValue(value)}</strong>
      </div>
      <div className="adm-meter">
        <div className={`adm-meter-fill ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export const CHART_COLORS = {
  revenue: "#2a523b",
  expenses: "#b4402f",
  net: "#2f6fb0",
  pain: "#b4402f",
  rom: "#2a523b",
  added: "#488b63",
  returning: "#b08d4f",
};
