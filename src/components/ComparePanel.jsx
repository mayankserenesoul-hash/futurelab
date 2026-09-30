import { useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

import useReducedMotion from "../hooks/useReducedMotion.js";
import {
  MAX_PINNED, nextLetter, differingKeys, describeScenario, defaultSeriesKey,
  buildChartRows, buildMetricRows, buildSentence, withUnit,
} from "../simulation/compare.js";

const COLORS = { A: "#0f766e", B: "#c2410c", C: "#4c3fa3" };
const compact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });
const formatTick = (n) => (typeof n === "number" && Number.isFinite(n) ? compact.format(n) : "");

function CompareTooltip({ active, payload, label, xLabel, unit }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-title">{xLabel} {label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="chart-tooltip-row">
          <span className="swatch" style={{ background: p.color }} aria-hidden="true" />
          Scenario {p.dataKey}: <strong>{withUnit(p.value, unit)}</strong>
        </p>
      ))}
    </div>
  );
}

function CompareView({ pinned }) {
  const reduced = useReducedMotion();
  const [chosen, setChosen] = useState(null);

  const series = pinned[0].result.series;
  const seriesKey = series.some((s) => s.key === chosen) ? chosen : defaultSeriesKey(series);
  const active = series.find((s) => s.key === seriesKey);

  const rows = buildChartRows(pinned, seriesKey);
  const metricRows = buildMetricRows(pinned);
  const sentence = buildSentence(pinned, seriesKey);
  const xLabel = pinned[0].result.xLabel;

  return (
    <div className="compare-view">
      <p className="compare-sentence">{sentence}</p>

      {series.length > 1 && (
        <div className="chips compare-chips" role="group" aria-label="Choose what to compare">
          {series.map((s) => (
            <button
              key={s.key}
              type="button"
              className="chip"
              aria-pressed={s.key === seriesKey}
              onClick={() => setChosen(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <div className="chart-box" role="img" aria-label={sentence}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 10, right: 20, bottom: 24, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d6d1c2" />
            <XAxis
              dataKey="x"
              tick={{ fontSize: 12 }}
              label={{ value: xLabel, position: "insideBottom", offset: -12, fontSize: 12 }}
            />
            <YAxis tickFormatter={formatTick} width={60} tick={{ fontSize: 12 }} />
            <Tooltip content={<CompareTooltip xLabel={xLabel} unit={active.unit} />} />
            <Legend verticalAlign="top" height={30} formatter={(v) => `Scenario ${v}`} />
            {pinned.map((p) => (
              <Line
                key={p.letter}
                type="linear"
                dataKey={p.letter}
                stroke={COLORS[p.letter]}
                strokeWidth={3}
                dot={rows.length <= 40}
                activeDot={{ r: 6 }}
                connectNulls={false}
                isAnimationActive={!reduced}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="table-wrap compare-table-wrap">
        <table className="data-table compare-table">
          <caption className="sr-only">Key results for each pinned scenario</caption>
          <thead>
            <tr>
              <th scope="col">Result</th>
              {pinned.map((p) => (
                <th scope="col" key={p.letter}>Scenario {p.letter}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metricRows.map((row) => (
              <tr key={row.key}>
                <th scope="row">{row.label}</th>
                {row.cells.map((cell, i) => (
                  <td key={pinned[i].letter}>
                    {cell.text}
                    {cell.delta && <span className="delta">{cell.delta}</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint">All numbers are calculated by the simulation engine from the variables you set.</p>
    </div>
  );
}

export default function ComparePanel({ pinned, hasResult, message, onPin, onRemove, onClear }) {
  const letter = nextLetter(pinned);
  const keys = differingKeys(pinned);
  const full = pinned.length >= MAX_PINNED;

  return (
    <section className="panel compare" aria-labelledby="compare-title">
      <h2 id="compare-title" className="panel-title">Compare scenarios</h2>
      <p className="hint compare-intro">
        Run a simulation and pin it. Change a variable, run again, and pin that too, to see them side by side.
      </p>

      <div className="compare-actions">
        <button type="button" className="btn btn-small" onClick={onPin} disabled={!hasResult || full}>
          {full ? "Comparison is full" : `Pin current result as Scenario ${letter}`}
        </button>
        {pinned.length > 0 && (
          <button type="button" className="btn btn-ghost btn-small" onClick={onClear}>
            Clear all
          </button>
        )}
      </div>

      {!hasResult && !full && <p className="hint">Run a simulation above to enable pinning.</p>}
      <p className="error-text" role="status">{message}</p>

      {pinned.length > 0 && (
        <ul className="pin-list">
          {pinned.map((p) => (
            <li key={p.letter} className="pin-item">
              <span className="pin-letter" style={{ background: COLORS[p.letter] }} aria-hidden="true">
                {p.letter}
              </span>
              <span className="pin-desc">
                <strong>Scenario {p.letter}</strong> · {p.title}
                <span className="pin-vars">{describeScenario(p, keys)}</span>
              </span>
              <button
                type="button"
                className="pin-remove"
                aria-label={`Remove scenario ${p.letter}`}
                onClick={() => onRemove(p.letter)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {pinned.length === 1 && (
        <p className="hint">
          Scenario {pinned[0].letter} is pinned. Change a variable, run the simulation again, and pin the new result.
        </p>
      )}
      {pinned.length >= 2 && <CompareView pinned={pinned} />}
    </section>
  );
}