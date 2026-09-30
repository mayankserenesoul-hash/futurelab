// Deterministic "insights": which input matters most, and a plain-language
// explanation built only from the simulation numbers. No AI, no React.
// The server uses this both as data for the AI and as a fallback when the AI is unavailable.

import { runSimulation } from "./index.js";
import { formatMetric, formatNumber } from "../utils/format.js";
import { withUnit } from "./compare.js";

const tidy = (n) => Math.round(n * 1e6) / 1e6;

// Nudges each input a little (+10%, or one step for whole numbers and zero values),
// re-runs the engine, and measures how much the main result moves.
export function computeSensitivity(scenario) {
  let base;
  try {
    base = runSimulation(scenario);
  } catch {
    return [];
  }
  const baseValue = base.metrics[0].value;
  const rows = [];

  for (const v of scenario.variables) {
    const step = v.step || 1;
    let to = v.value === 0 ? step : v.value * 1.1;
    if (step === 1) {
      const rounded = Math.round(to);
      to = rounded === v.value ? v.value + 1 : rounded;
    }
    to = tidy(Math.min(v.max, Math.max(v.min, to)));
    if (to === v.value) continue; // already at its limit

    let alt;
    try {
      alt = runSimulation({
        ...scenario,
        variables: scenario.variables.map((x) => (x.key === v.key ? { ...x, value: to } : x)),
      });
    } catch {
      continue;
    }

    const diff = alt.metrics[0].value - baseValue;
    const impactRaw = baseValue !== 0 ? (diff / Math.abs(baseValue)) * 100 : null;
    const inputPct = v.value !== 0 ? ((to - v.value) / Math.abs(v.value)) * 100 : null;
    const elasticity =
      impactRaw !== null && inputPct !== null && inputPct !== 0
        ? Math.round((impactRaw / inputPct) * 100) / 100
        : null;

    rows.push({
      key: v.key,
      label: v.label,
      unit: v.unit,
      from: v.value,
      to,
      impactPct: impactRaw === null ? null : Math.round(impactRaw * 10) / 10,
      elasticity,
    });
  }

  // Inputs we could compare fairly (non-zero values) come first, strongest response first
  const score = (r) => (r.elasticity !== null ? 1000 + Math.abs(r.elasticity) : Math.abs(r.impactPct ?? 0));
  return rows.sort((a, b) => score(b) - score(a));
}

function describeImpact(impactPct) {
  if (impactPct === null) return "an amount that can't be shown as a percentage";
  if (impactPct === 0) return "no measurable amount";
  return `about ${impactPct > 0 ? "+" : "-"}${formatNumber(Math.abs(impactPct))}%`;
}

// Plain-language explanation of the results, from the numbers only.
export function explainLocally(scenario, result, sens = computeSensitivity(scenario)) {
  const primary = result.metrics[0];
  const lines = [
    `Under these assumptions, after ${result.durationLabel}, this simulation shows ${primary.label.toLowerCase()} of ${formatMetric(primary)}.`,
  ];
  const top = sens[0];
  if (top) {
    lines.push(
      `Of the inputs tested, ${top.label.toLowerCase()} has the biggest effect: changing it from ${withUnit(top.from, top.unit)} to ${withUnit(top.to, top.unit)} moves this result by ${describeImpact(top.impactPct)}.`
    );
  }
  lines.push(
    `Model limitation: ${scenario.limitations[0]}. This is an illustrative simulation, and the actual outcome may differ.`
  );
  return lines.join("\n");
}

// Answer to "which variable matters most?", from the numbers only.
export function explainSensitivity(scenario, result, sens = computeSensitivity(scenario)) {
  if (!sens.length) return "There aren't enough adjustable inputs to compare in this scenario.";
  const primary = result.metrics[0];
  const lines = sens
    .slice(0, 3)
    .map(
      (s, i) =>
        `${i + 1}. ${s.label}: changing it from ${withUnit(s.from, s.unit)} to ${withUnit(s.to, s.unit)} moves ${primary.label.toLowerCase()} by ${describeImpact(s.impactPct)}.`
    );
  return [
    "Under these assumptions, this is how much each input matters, based on small test changes run by the simulation engine:",
    ...lines,
    "Inputs are ranked by how strongly the result responds relative to the size of the change. The actual outcome may differ.",
  ].join("\n");
}