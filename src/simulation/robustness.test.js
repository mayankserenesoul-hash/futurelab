import test from "node:test";
import assert from "node:assert/strict";
import { runSimulation, SimulationError } from "./index.js";
import { CATEGORY_IDS, TEMPLATES, buildScenario } from "../../shared/templates.js";
import { computeSensitivity, explainLocally, explainSensitivity } from "./insights.js";
import { formatMetric, formatNumber } from "../utils/format.js";
import { validateVariable } from "../utils/validation.js";

// Small seeded random generator, so this test gives the same result every run
function makeRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const BAD_TEXT = /NaN|Infinity|undefined|null/;

function scenarioWith(category, pick) {
  const variables = TEMPLATES[category].variables.map((d) => {
    let value = pick(d);
    if (d.integer) value = Math.round(value);
    value = Math.min(d.max, Math.max(d.min, value));
    return { key: d.key, label: d.label, value, unit: d.unit, min: d.min, max: d.max, step: d.step, integer: d.integer, source: "user" };
  });
  return { category, categoryLabel: TEMPLATES[category].categoryLabel, title: "t", limitations: ["l"], assumptions: [], aiAssumptions: [], variables };
}

// Runs a scenario. It must either fail with a SimulationError, or return only clean numbers.
function checkScenario(s, label) {
  let result;
  try {
    result = runSimulation(s);
  } catch (err) {
    assert.ok(err instanceof SimulationError, `${label}: unexpected ${err}`);
    return;
  }
  for (const row of result.data) {
    for (const v of Object.values(row)) assert.ok(Number.isFinite(v), `${label}: bad number in data`);
  }
  for (const m of result.metrics) {
    assert.ok(!BAD_TEXT.test(formatMetric(m)), `${label}: ${m.key} shows "${formatMetric(m)}"`);
  }
  for (const row of result.data) {
    for (const sr of result.series) assert.ok(!BAD_TEXT.test(formatNumber(row[sr.key])), label);
  }
  // The insight helpers must never crash or print junk either
  const sens = computeSensitivity(s);
  for (const text of [explainLocally(s, result, sens), explainSensitivity(s, result, sens)]) {
    assert.ok(!BAD_TEXT.test(text), `${label}: ${text}`);
  }
}

test("robustness: extreme values (all minimums, all maximums) never produce junk", () => {
  for (const id of CATEGORY_IDS) {
    checkScenario(scenarioWith(id, (d) => d.min), `${id} min`);
    checkScenario(scenarioWith(id, (d) => d.max), `${id} max`);
  }
});

test("robustness: 400 random scenarios per category never produce junk", () => {
  const rand = makeRandom(12345);
  for (const id of CATEGORY_IDS) {
    for (let i = 0; i < 400; i++) {
      const s = scenarioWith(id, (d) => {
        const mode = rand();
        if (mode < 0.15) return d.min;
        if (mode < 0.3) return d.max;
        if (mode < 0.6) return d.min + rand() * (d.max - d.min); // anywhere in range
        return d.default * (0.1 + rand() * 3); // near the normal values
      });
      checkScenario(s, `${id} #${i}`);
    }
  }
});

test("validation: whole-number inputs reject decimals", () => {
  const months = buildScenario("finance").variables.find((v) => v.key === "months");
  assert.equal(months.integer, true);
  assert.match(validateVariable({ ...months, value: 12.5 }), /whole number/);
  assert.equal(validateVariable({ ...months, value: 12 }), "");

  const rate = buildScenario("finance").variables.find((v) => v.key === "rate");
  assert.equal(validateVariable({ ...rate, value: 4.5 }), "");
});

test("validation: empty, text, and out-of-range values are all rejected", () => {
  const v = buildScenario("finance").variables[0];
  for (const bad of ["", null, undefined, NaN, Infinity, "abc", -1, v.max + 1]) {
    assert.notEqual(validateVariable({ ...v, value: bad }), "", String(bad));
  }
});