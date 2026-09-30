import test from "node:test";
import assert from "node:assert/strict";
import { runSimulation } from "./index.js";
import { buildScenario, CATEGORY_IDS } from "../../shared/templates.js";
import { computeSensitivity, explainLocally, explainSensitivity } from "./insights.js";

test("sensitivity: starting size scales 1-to-1, growth rate and duration respond less per % change", () => {
  const s = buildScenario("population", { rate: 2, years: 20, population: 1000000 });
  const sens = computeSensitivity(s);
  assert.equal(sens[0].key, "population");
  assert.equal(sens[0].elasticity, 1);
  for (const key of ["rate", "years"]) {
    const row = sens.find((r) => r.key === key);
    assert.ok(row.elasticity > 0 && row.elasticity < 1, `${key}: ${row.elasticity}`);
  }
});

test("sensitivity: inputs already at their limit are skipped, zero inputs use a step", () => {
  const s = buildScenario("learning", { hoursPerDay: 2, months: 6, daysPerMonth: 30, consistency: 100 });
  const sens = computeSensitivity(s);
  assert.ok(!sens.some((r) => r.key === "consistency"), "consistency is already 100%");

  const f = computeSensitivity(buildScenario("finance", { monthly: 2000, months: 12 }));
  const rate = f.find((r) => r.key === "rate");
  assert.equal(rate.from, 0);
  assert.equal(rate.to, 0.5);
  assert.equal(rate.elasticity, null);
  assert.equal(f[f.length - 1].key, "rate"); // zero-based inputs are ranked last
});

test("insights: every category gives finite, clean text", () => {
  for (const id of CATEGORY_IDS) {
    const scenario = buildScenario(id);
    const result = runSimulation(scenario);
    const sens = computeSensitivity(scenario);
    for (const row of sens) {
      assert.ok(Number.isFinite(row.to), id);
      assert.ok(row.impactPct === null || Number.isFinite(row.impactPct), id);
    }
    const texts = [explainLocally(scenario, result, sens), explainSensitivity(scenario, result, sens)];
    for (const t of texts) {
      assert.ok(!/NaN|Infinity|undefined/.test(t), `${id}: ${t}`);
      assert.match(t, /Under these assumptions|actual outcome may differ/);
    }
  }
});

test("insights: local explanation states the real result and never promises it", () => {
  const scenario = buildScenario("finance", { monthly: 2000, months: 12 });
  const text = explainLocally(scenario, runSimulation(scenario));
  assert.match(text, /₹24,000/);
  assert.match(text, /may differ/);
  assert.ok(!/will happen|guarantee/i.test(text));
});