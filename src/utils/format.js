// Number formatting that never shows NaN, Infinity, or undefined.

export function formatNumber(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  const value = n === 0 ? 0 : n; // avoid "-0"
  // Whole numbers for big values, up to 2 decimals for small ones (no fake precision)
  const digits = Math.abs(value) >= 100 ? 0 : 2;
  return value.toLocaleString("en-IN", { maximumFractionDigits: digits });
}

export function formatMetric(metric) {
  const v = metric.value;
  const negative = typeof v === "number" && Number.isFinite(v) && v < 0;
  const body = formatNumber(negative ? -v : v);
  return `${negative ? "-" : ""}${metric.prefix || ""}${body}${metric.suffix || ""}`;
}
