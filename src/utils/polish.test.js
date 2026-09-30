import test from "node:test";
import assert from "node:assert/strict";
import { buildScenario, CATEGORY_IDS } from "../../shared/templates.js";
import { runSimulation } from "../simulation/index.js";
import { encodeScenario, decodeScenario } from "./share.js";
import { resultToCsv } from "./exportCsv.js";
import { loadHistory, saveHistory } from "./sessionHistory.js";

/* ---------- share links ---------- */

test("share: every category survives an encode -> decode round trip", () => {
  for (const id of CATEGORY_IDS) {
    const original = buildScenario(id);
    const decoded = decodeScenario(encodeScenario(original));
    assert.ok(decoded, id);
    assert.equal(decoded.category, id);
    assert.deepEqual(
      decoded.variables.map((v) => [v.key, v.value, v.source]),
      original.variables.map((v) => [v.key, v.value, v.source])
    );
    // and the shared scenario simulates to exactly the same result
    assert.deepEqual(runSimulation(decoded), runSimulation(original));
  }
});

test("share: edited values and their origin are kept", () => {
  const s = buildScenario("finance", { monthly: 3000, months: 24 });
  const decoded = decodeScenario(encodeScenario(s));
  const monthly = decoded.variables.find((v) => v.key === "monthly");
  assert.equal(monthly.value, 3000);
  assert.equal(monthly.source, "user");
  assert.equal(decoded.variables.find((v) => v.key === "start").source, "assumption");
});

test("share: bad, tampered, or oversized codes are refused", () => {
  const good = encodeScenario(buildScenario("finance"));
  const bad = [
    "", "nonsense", "weather~a:1:u", "finance~", "finance~monthly:abc:u",
    "finance~monthly:2000:u",                          // missing the other inputs
    good.replace("monthly:2000", "monthly:-5"),        // out of range
    good.replace("months:12", "months:99999"),         // out of range
    good + "~extra", "finance~monthly:1:u:zz,months:1:u,start:0:u,rate:0:u",
    "x".repeat(401), null, undefined, 42, {},
  ];
  for (const code of bad) assert.equal(decodeScenario(code), null, String(code).slice(0, 40));
});

test("share: unknown keys in a link are ignored, never trusted", () => {
  const code = encodeScenario(buildScenario("finance")) + ",hacker:999:u,__proto__:1:u";
  const decoded = decodeScenario(code);
  assert.ok(decoded);
  assert.ok(!decoded.variables.some((v) => v.key === "hacker"));
  assert.equal(decoded.variables.length, 4);
});

/* ---------- CSV ---------- */

test("csv: contains inputs, assumptions, limitations, results and every data row", () => {
  const scenario = buildScenario("finance", { monthly: 2000, months: 12 });
  const result = runSimulation(scenario);
  const csv = resultToCsv(scenario, result);
  const lines = csv.split("\r\n");

  assert.match(csv, /not a prediction/);
  assert.match(csv, /Monthly contribution,2000,₹,user input/);
  assert.match(csv, /Duration,12,months,user input/);
  assert.match(csv, /Estimated balance,"₹24,000"/); // commas force quoting
  assert.match(csv, /Model limitations/);
  const header = lines.findIndex((l) => l.startsWith("Month,"));
  assert.equal(lines.length - header - 1, result.data.length); // one line per data point
});

test("csv: spreadsheet formulas in text are neutralised, real negatives are not", () => {
  const scenario = buildScenario("custom");
  scenario.assumptions = ['=HYPERLINK("http://evil.example","click")', "+1+1", "@SUM(A1)", "-cmd", "-5% growth"];
  scenario.aiAssumptions = ["fine, with a comma", 'has "quotes"'];
  const csv = resultToCsv(scenario, runSimulation(scenario));

  assert.match(csv, /'=HYPERLINK/);
  assert.match(csv, /'\+1\+1/);
  assert.match(csv, /'@SUM/);
  assert.match(csv, /'-cmd/);
  assert.match(csv, /\n-5% growth\r?\n/); // starts with "-5", so it is a normal number-like text
  assert.match(csv, /"fine, with a comma"/);
  assert.match(csv, /"has ""quotes"""/);
});

test("csv: negative results keep their minus sign", () => {
  const scenario = buildScenario("pricing", { price: 100, customers: 1000, priceChange: 10, customerChange: -20, months: 12 });
  const csv = resultToCsv(scenario, runSimulation(scenario));
  assert.match(csv, /Change in monthly revenue,-\d/);
});

/* ---------- session history ---------- */

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = v; },
  };
}
const entry = (text, category = "finance") => ({ id: text, text, scenario: buildScenario(category) });

test("history: saved scenarios load back, newest first, capped at 6", () => {
  const storage = fakeStorage();
  const items = ["a", "b", "c", "d", "e", "f", "g", "h"].map((t) => entry(t));
  saveHistory(items, storage);
  const loaded = loadHistory(storage);
  assert.equal(loaded.length, 6);
  assert.equal(loaded[0].text, "a");
  assert.deepEqual(runSimulation(loaded[0].scenario), runSimulation(items[0].scenario));
});

test("history: missing, broken, or tampered storage gives an empty list, never a crash", () => {
  assert.deepEqual(loadHistory(null), []);
  assert.deepEqual(loadHistory(fakeStorage()), []);
  for (const raw of ["not json", "{}", "42", "null", '[{"id":1}]', '[{"id":"x","text":"y","scenario":{"category":"weather"}}]']) {
    assert.deepEqual(loadHistory(fakeStorage({ "futurelab.history.v1": raw })), [], raw);
  }
  const tampered = entry("t");
  tampered.scenario.variables[0].value = "NaN-ish";
  const storage = fakeStorage();
  saveHistory([tampered, entry("ok")], storage);
  assert.deepEqual(loadHistory(storage).map((h) => h.text), ["ok"]); // bad one dropped, good one kept
});

test("history: a storage that throws is handled quietly", () => {
  const broken = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("full"); } };
  assert.deepEqual(loadHistory(broken), []);
  assert.doesNotThrow(() => saveHistory([entry("x")], broken));
});