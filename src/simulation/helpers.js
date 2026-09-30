// Small shared tools for the simulation engine. No React, no browser code.

export class SimulationError extends Error {
  constructor(message) {
    super(message);
    this.name = "SimulationError";
  }
}

// Anything bigger than this is treated as "too large to show reliably".
export const MAX_ABS_VALUE = 1e15;

export function round1(n) {
  const r = Math.round(n * 10) / 10;
  return r === 0 ? 0 : r; // avoids "-0"
}

export function round2(n) {
  const r = Math.round(n * 100) / 100;
  return r === 0 ? 0 : r;
}

// Reads a number from the values object, or throws a clear error.
export function getValue(values, key) {
  const v = values[key];
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new SimulationError(`Missing or invalid value: ${key}`);
  }
  return v;
}

// Turns [{ key: "monthly", value: 2000, ... }] into { monthly: 2000 }
export function toValues(variables) {
  const values = {};
  for (const v of variables) values[v.key] = v.value;
  return values;
}

// Durations are whole periods (12.7 months is treated as 12). Minimum 1.
export function wholePeriods(n) {
  return Math.max(1, Math.floor(n));
}

export function plural(n, word) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

// Percentage change from -> to. Returns null when it can't be calculated.
export function pctChange(from, to) {
  if (from === 0) return null;
  return round1(((to - from) / Math.abs(from)) * 100);
}

export function makeMetric(key, label, value, { prefix = "", suffix = "" } = {}) {
  return { key, label, value, prefix, suffix, kind: "calculated" };
}

// Throws if any number is NaN, Infinity, or unreasonably large.
export function assertResultIsSafe(output) {
  const bad = (n) =>
    typeof n === "number" && (!Number.isFinite(n) || Math.abs(n) > MAX_ABS_VALUE);

  const unsafe =
    output.data.some((row) => Object.values(row).some(bad)) ||
    output.metrics.some((m) => bad(m.value));

  if (unsafe) {
    throw new SimulationError(
      "The result is too large to show reliably. Try smaller values or a shorter duration."
    );
  }
}
