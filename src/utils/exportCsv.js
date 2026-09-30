// Builds a CSV of a simulation and downloads it. Opens cleanly in Excel and Google Sheets.
import { formatMetric } from "./format.js";

// Text that starts with = + @ (or - followed by a letter) could run as a formula in a
// spreadsheet, so it gets a leading apostrophe. Real negative numbers are left alone.
function csvCell(value) {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (typeof value === "string" && /^([=+@\t\r]|-(?![\d₹.,]))/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function resultToCsv(scenario, result) {
  const rows = [
    ["FutureLab simulation (illustrative, not a prediction)"],
    ["Scenario", scenario.title],
    ["Type", scenario.categoryLabel],
    ["Model", scenario.formula],
    [],
    ["Inputs"],
    ["Name", "Value", "Unit", "Origin"],
    ...scenario.variables.map((v) => [v.label, v.value, v.unit, v.source === "user" ? "user input" : "assumption"]),
    [],
    ["Assumptions"],
    ...[...scenario.assumptions, ...(scenario.aiAssumptions || [])].map((a) => [a]),
    [],
    ["Model limitations"],
    ...scenario.limitations.map((l) => [l]),
    [],
    ["Key results (calculated)"],
    ["Result", "Value"],
    ...result.metrics.map((m) => [m.label, formatMetric(m)]),
    [],
    ["Data"],
    [result.xLabel, ...result.series.map((s) => `${s.label} (${s.unit})`)],
    ...result.data.map((row) => [row.x, ...result.series.map((s) => row[s.key])]),
  ];
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}

export function downloadCsv(filename, text) {
  // The BOM makes Excel read the file as UTF-8, so the ₹ sign displays correctly
  const blob = new Blob(["\uFEFF", text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}