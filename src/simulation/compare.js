// Pure logic for comparing pinned scenarios. No React, no browser code.
import { formatNumber, formatMetric } from "../utils/format.js";
import { round1 } from "./helpers.js";

export const MAX_PINNED = 3;
export const LETTERS = ["A", "B", "C"];

const same = (a, b) => Math.abs(a - b) < 1e-9;

// 2000 + "₹" -> "₹2,000", 12 + "months" -> "12 months", 5 + "%" -> "5%"
export function withUnit(n, unit) {
  if (unit === "₹") return `₹${formatNumber(n)}`;
  if (unit === "%") return `${formatNumber(n)}%`;
  return `${formatNumber(n)} ${unit}`;
}

export function nextLetter(pinned) {
  const used = new Set(pinned.map((p) => p.letter));
  return LETTERS.find((l) => !used.has(l)) || null;
}

// Tries to add the current scenario. Returns { pinned } on success or { error } on failure.
export function pinScenario(pinned, scenario, result) {
  if (!scenario || !result) return { error: "Run a simulation first, then pin it." };
  if (pinned.length >= MAX_PINNED) {
    return { error: `You can compare up to ${MAX_PINNED} scenarios. Remove one first.` };
  }
  if (pinned.length > 0 && pinned[0].category !== scenario.category) {
    return {
      error: "Comparison works with scenarios of the same type. Clear the pins to start a new comparison.",
    };
  }
  const key = scenario.variables.map((v) => `${v.key}=${v.value}`).join("|");
  if (pinned.some((p) => p.key === key)) {
    return { error: "This exact scenario is already pinned. Change a variable and run again." };
  }

  const letter = nextLetter(pinned);
  const entry = {
    id: letter,
    letter,
    key,
    category: scenario.category,
    categoryLabel: scenario.categoryLabel,
    title: scenario.title,
    variables: scenario.variables.map((v) => ({ ...v })),
    result,
  };
  const list = [...pinned, entry].sort((a, b) => LETTERS.indexOf(a.letter) - LETTERS.indexOf(b.letter));
  return { pinned: list };
}

// Variable keys whose values are not identical across all pinned scenarios
export function differingKeys(pinned) {
  if (pinned.length < 2) return [];
  return pinned[0].variables
    .map((v) => v.key)
    .filter((key) => new Set(pinned.map((p) => p.variables.find((v) => v.key === key)?.value)).size > 1);
}

export function describeScenario(p, keys) {
  const shown = keys.length ? keys : p.variables.map((v) => v.key);
  return p.variables
    .filter((v) => shown.includes(v.key))
    .map((v) => `${v.label}: ${withUnit(v.value, v.unit)}`)
    .join(", ");
}

export function defaultSeriesKey(series) {
  return series.some((s) => s.key === "scenario") ? "scenario" : series[0].key;
}

const finalValue = (p, key) => p.result.data[p.result.data.length - 1][key];

// One row per x value, one column per scenario letter. Shorter scenarios simply stop early.
export function buildChartRows(pinned, seriesKey) {
  const maxX = Math.max(...pinned.map((p) => p.result.data[p.result.data.length - 1].x));
  const lookups = pinned.map((p) => new Map(p.result.data.map((d) => [d.x, d])));
  const rows = [];
  for (let x = 0; x <= maxX; x++) {
    const row = { x };
    pinned.forEach((p, i) => {
      const point = lookups[i].get(x);
      if (point) row[p.letter] = point[seriesKey];
    });
    rows.push(row);
  }
  return rows;
}

// "+₹12,000 (+50%) vs A"
export function formatDelta(base, m, baseLetter) {
  const diff = m.value - base.value;
  if (!Number.isFinite(diff)) return "";
  if (same(diff, 0)) return `same as ${baseLetter}`;
  const sign = diff > 0 ? "+" : "-";
  const abs = Math.abs(diff);
  if ((m.suffix || "").trim() === "%") return `${sign}${formatNumber(abs)} points vs ${baseLetter}`;
  const body = `${sign}${m.prefix || ""}${formatNumber(abs)}${m.suffix || ""}`;
  const pct =
    base.value !== 0 ? ` (${sign}${formatNumber(round1((abs / Math.abs(base.value)) * 100))}%)` : "";
  return `${body}${pct} vs ${baseLetter}`;
}

// Rows for the side-by-side table. Metrics missing in a scenario show a dash.
export function buildMetricRows(pinned) {
  const base = pinned[0];
  const first = new Map();
  for (const p of pinned) {
    for (const m of p.result.metrics) if (!first.has(m.key)) first.set(m.key, m);
  }
  return [...first.values()].map((meta) => ({
    key: meta.key,
    label: meta.label,
    cells: pinned.map((p, i) => {
      const m = p.result.metrics.find((x) => x.key === meta.key);
      if (!m) return { text: "—", delta: "" };
      const baseMetric = base.result.metrics.find((x) => x.key === meta.key);
      return {
        text: formatMetric(m),
        delta: i === 0 || !baseMetric ? "" : formatDelta(baseMetric, m, base.letter),
      };
    }),
  }));
}

// A plain-language summary, built from the numbers (no AI).
export function buildSentence(pinned, seriesKey) {
  if (pinned.length < 2) return "";
  const series = pinned[0].result.series.find((s) => s.key === seriesKey);
  if (!series) return "";
  const base = pinned[0];
  const baseValue = finalValue(base, seriesKey);

  const parts = pinned.slice(1).map((p) => {
    const diff = finalValue(p, seriesKey) - baseValue;
    if (same(diff, 0)) return `${p.letter} ends the same as ${base.letter}`;
    const dir = diff > 0 ? "higher" : "lower";
    const pct =
      baseValue !== 0 ? ` (${formatNumber(round1((Math.abs(diff) / Math.abs(baseValue)) * 100))}%)` : "";
    return `${p.letter} is ${withUnit(Math.abs(diff), series.unit)}${pct} ${dir} than ${base.letter}`;
  });

  const lengths = new Set(pinned.map((p) => p.result.data.length));
  const note =
    lengths.size > 1 ? " Each scenario is compared at its own last period, and the durations differ." : "";
  return `Under these assumptions, at the end (${series.label.toLowerCase()}): ${parts.join("; ")}.${note} The actual outcome may differ.`;
}