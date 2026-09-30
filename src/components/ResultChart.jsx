import { useMemo, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { formatNumber } from "../utils/format.js";
import useReducedMotion from "../hooks/useReducedMotion.js";

const COLORS = ["#0f766e", "#c2410c", "#4c3fa3"];
const compact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });

function formatTick(n) {
  return typeof n === "number" && Number.isFinite(n) ? compact.format(n) : "";
}

function ChartTooltip({ active, payload, label, xLabel, seriesMap }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-title">{xLabel} {label}</p>
      {payload.map((p) => {
        const s = seriesMap[p.dataKey];
        if (!s) return null;
        return (
          <p key={p.dataKey} className="chart-tooltip-row">
            <span className="swatch" style={{ background: p.color }} aria-hidden="true" />
            {s.label}: <strong>{formatNumber(p.value)} {s.unit}</strong>
          </p>
        );
      })}
    </div>
  );
}

export default function ResultChart({ result }) {
  const reduced = useReducedMotion();
  const [type, setType] = useState("line");
  const [groupIndex, setGroupIndex] = useState(0);

  // Series that share a unit can share one axis. Different units get separate tabs.
  const groups = useMemo(() => {
    const map = new Map();
    for (const s of result.series) {
      if (!map.has(s.unit)) map.set(s.unit, []);
      map.get(s.unit).push(s);
    }
    return [...map.values()];
  }, [result]);

  const active = groups[Math.min(groupIndex, groups.length - 1)];
  const seriesMap = Object.fromEntries(result.series.map((s) => [s.key, s]));
  const colorFor = (key) =>
    COLORS[result.series.findIndex((s) => s.key === key) % COLORS.length];

  const showDots = result.data.length <= 40;
  const last = result.data[result.data.length - 1];
  const summary =
    `${type === "line" ? "Line" : "Bar"} chart of ${active.map((s) => s.label).join(" and ")} ` +
    `over ${result.durationLabel}. At the end: ` +
    active.map((s) => `${s.label} ${formatNumber(last[s.key])} ${s.unit}`).join(", ") +
    ". A table of all values is available below.";

  const margin = { top: 10, right: 20, bottom: 24, left: 10 };
  const xAxisLabel = { value: result.xLabel, position: "insideBottom", offset: -12, fontSize: 12 };
  const tooltip = <ChartTooltip xLabel={result.xLabel} seriesMap={seriesMap} />;

  return (
    <div className="chart-block">
      <div className="chart-controls">
        {groups.length > 1 && (
          <div className="chips" role="group" aria-label="Choose what to chart">
            {groups.map((g, i) => (
              <button
                key={g[0].key}
                type="button"
                className="chip"
                aria-pressed={i === groupIndex}
                onClick={() => setGroupIndex(i)}
              >
                {g.map((s) => s.label).join(" + ")}
              </button>
            ))}
          </div>
        )}
        <div className="chips" role="group" aria-label="Chart type">
          {["line", "bar"].map((t) => (
            <button
              key={t}
              type="button"
              className="chip"
              aria-pressed={type === t}
              onClick={() => setType(t)}
            >
              {t === "line" ? "Line" : "Bar"}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-box" role="img" aria-label={summary}>
        <ResponsiveContainer width="100%" height="100%">
          {type === "line" ? (
            <LineChart data={result.data} margin={margin}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d6d1c2" />
              <XAxis dataKey="x" tick={{ fontSize: 12 }} label={xAxisLabel} />
              <YAxis tickFormatter={formatTick} width={60} tick={{ fontSize: 12 }} />
              <Tooltip content={tooltip} />
              {active.length > 1 && <Legend verticalAlign="top" height={30} />}
              {active.map((s) => (
                <Line
                  key={s.key}
                  type="linear"
                  dataKey={s.key}
                  name={s.label}
                  stroke={colorFor(s.key)}
                  strokeWidth={3}
                  dot={showDots}
                  activeDot={{ r: 6 }}
                  isAnimationActive={!reduced}
                />
              ))}
            </LineChart>
          ) : (
            <BarChart data={result.data} margin={margin}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d6d1c2" />
              <XAxis dataKey="x" tick={{ fontSize: 12 }} label={xAxisLabel} />
              <YAxis tickFormatter={formatTick} width={60} tick={{ fontSize: 12 }} />
              <Tooltip content={tooltip} cursor={{ fill: "rgba(15,118,110,0.08)" }} />
              {active.length > 1 && <Legend verticalAlign="top" height={30} />}
              {active.map((s) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  fill={colorFor(s.key)}
                  isAnimationActive={!reduced}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
