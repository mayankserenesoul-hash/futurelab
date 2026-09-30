import test from "node:test";
import assert from "node:assert/strict";
import { runSimulation, SimulationError } from "./index.js";
import { buildScenario, CATEGORY_IDS } from "../../shared/templates.js";

// Builds a minimal scenario for testing
function make(category, values) {
  return {
    category,
    variables: Object.entries(values).map(([key, value]) => ({
      key, label: key, value, min: 0, max: 1e12,
    })),
  };
}

const metric = (result, key) => result.metrics.find((m) => m.key === key)?.value;
const close = (actual, expected, tol = 0.02) =>
  assert.ok(Math.abs(actual - expected) <= tol, `expected ~${expected}, got ${actual}`);

test("savings: ₹2000 x 12 months, no growth = ₹24,000", () => {
  const r = runSimulation(make("finance", { monthly: 2000, months: 12, start: 0, rate: 0 }));
  assert.equal(metric(r, "finalBalance"), 24000);
  assert.equal(metric(r, "totalContributed"), 24000);
  assert.equal(metric(r, "growthEarned"), 0);
  assert.equal(r.data.length, 13); // months 0..12
  assert.equal(r.data[0].balance, 0);
});

test("savings: a starting balance is added", () => {
  const r = runSimulation(make("finance", { monthly: 2000, months: 12, start: 1000, rate: 0 }));
  assert.equal(metric(r, "finalBalance"), 25000);
});

test("savings: 12% annual growth, compounded monthly", () => {
  const r = runSimulation(make("finance", { monthly: 2000, months: 12, start: 0, rate: 12 }));
  close(metric(r, "finalBalance"), 25365.01);
});

test("learning: 2h x 30 days x 6 months = 360 hours", () => {
  const r = runSimulation(make("learning", { hoursPerDay: 2, months: 6, daysPerMonth: 30, consistency: 100 }));
  assert.equal(metric(r, "totalHours"), 360);
  assert.equal(metric(r, "workingDays"), 45);
});

test("learning: 50% consistency halves the total", () => {
  const r = runSimulation(make("learning", { hoursPerDay: 2, months: 6, daysPerMonth: 30, consistency: 50 }));
  assert.equal(metric(r, "totalHours"), 180);
});

test("business: 100 customers growing 5% monthly for 12 months", () => {
  const r = runSimulation(make("business", { customers: 100, growth: 5, months: 12, revenuePer: 500 }));
  close(metric(r, "finalCustomers"), 179.59, 0.01);
});

test("population: 2% for 20 years, and doubling time", () => {
  const r = runSimulation(make("population", { population: 1000000, rate: 2, years: 20 }));
  close(metric(r, "finalPopulation"), 1485947.4, 0.1);
  assert.equal(metric(r, "doublingTime"), 35);
});

test("custom: 100 growing 10% for 2 periods = 121", () => {
  const r = runSimulation(make("custom", { start: 100, change: 10, periods: 2 }));
  assert.equal(metric(r, "finalValue"), 121);
});

test("pricing: +10% price, -5% customers over 12 months", () => {
  const s = buildScenario("pricing", {
    price: 100, customers: 1000, priceChange: 10, customerChange: -5, months: 12,
  });
  const r = runSimulation(s);
  assert.equal(metric(r, "finalRevenue"), 104500); // 110 x 950
  assert.equal(metric(r, "revenueChange"), 4.5);
  assert.equal(metric(r, "breakEven"), -9.1);
});

test("pricing: losing more customers than break-even lowers revenue", () => {
  const s = buildScenario("pricing", {
    price: 100, customers: 1000, priceChange: 10, customerChange: -20, months: 12,
  });
  assert.ok(metric(runSimulation(s), "revenueChange") < 0);
});

test("rejects an invalid variable", () => {
  const s = make("finance", { monthly: -5, months: 12, start: 0, rate: 0 });
  assert.throws(() => runSimulation(s), SimulationError);
});

test("rejects an unsupported category", () => {
  assert.throws(() => runSimulation(make("weather", { a: 1 })), SimulationError);
});

test("rejects results that are too large", () => {
  const s = make("business", { customers: 1e8, growth: 1000, months: 120, revenuePer: 500 });
  assert.throws(() => runSimulation(s), /too large/);
});

test("same inputs always give the same output", () => {
  const s = make("finance", { monthly: 2500, months: 24, start: 500, rate: 6 });
  assert.deepEqual(runSimulation(s), runSimulation(s));
});

test("buildScenario: stated values are 'user', the rest are 'assumption'", () => {
  const s = buildScenario("finance", { monthly: 3000, months: 24 });
  const byKey = Object.fromEntries(s.variables.map((v) => [v.key, v]));
  assert.equal(byKey.monthly.value, 3000);
  assert.equal(byKey.monthly.source, "user");
  assert.equal(byKey.months.value, 24);
  assert.equal(byKey.start.source, "assumption");
});

test("buildScenario: out-of-range and unknown values are rejected safely", () => {
  const s = buildScenario("finance", { monthly: -5, hacker: 999 });
  const monthly = s.variables.find((v) => v.key === "monthly");
  assert.equal(monthly.value, 2000);
  assert.equal(monthly.source, "assumption");
  assert.ok(s.assumptions.some((a) => /allowed range/.test(a)));
  assert.ok(!s.variables.some((v) => v.key === "hacker"));
});

test("every category's defaults produce clean, finite numbers", () => {
  for (const id of CATEGORY_IDS) {
    const result = runSimulation(buildScenario(id));
    assert.ok(result.data.length > 1, id);
    for (const row of result.data) {
      for (const value of Object.values(row)) assert.ok(Number.isFinite(value), id);
    }
    for (const m of result.metrics) assert.ok(Number.isFinite(m.value), id);
  }
});
