import test from "node:test";
import assert from "node:assert/strict";

process.env.GEMINI_API_KEY = "test-key";
process.env.GEMINI_MODEL = "test-model";
process.env.GEMINI_FALLBACK_MODEL = "test-model"; // one model only, keeps the failure tests fast

const { explainScenario } = await import("./explain.js");
const { AiError } = await import("./gemini.js");

const realFetch = globalThis.fetch;
const aiSays = (obj) => async () => ({
  ok: true,
  status: 200,
  json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }),
});
const aiDown = async () => ({ ok: false, status: 503, json: async () => ({ error: { message: "high demand" } }) });

const savings = (monthly = 2000) => ({
  category: "finance",
  title: "Regular savings",
  variables: [
    { key: "monthly", value: monthly, source: "user" },
    { key: "months", value: 12, source: "user" },
    { key: "start", value: 0, source: "assumption" },
    { key: "rate", value: 0, source: "assumption" },
  ],
});

test("explain: AI answer comes back tagged as ai, with no comparison", async () => {
  globalThis.fetch = aiSays({ answer: "Under these assumptions the balance grows steadily.", changes: null });
  const out = await explainScenario({ scenario: savings() });
  assert.equal(out.source, "ai");
  assert.equal(out.comparison, null);
  assert.match(out.answer, /Under these assumptions/);
});

test("ask: suggested changes are calculated by the engine, not the AI", async () => {
  globalThis.fetch = aiSays({ answer: "I changed the monthly saving.", changes: { monthly: 3000 } });
  const out = await explainScenario({ scenario: savings(), question: "What changes if I save 3000?" });
  assert.equal(out.comparison.changes[0].to, 3000);
  const row = out.comparison.rows.find((r) => r.key === "finalBalance");
  assert.equal(row.before.value, 24000);
  assert.equal(row.after.value, 36000);
});

test("ask: unknown keys and out-of-range values from the AI are ignored", async () => {
  globalThis.fetch = aiSays({ answer: "x", changes: { hacker: 5, monthly: -50, months: 99999 } });
  const out = await explainScenario({ scenario: savings(), question: "try something" });
  assert.equal(out.comparison, null);
});

test("explain: when the AI is down, a local explanation is returned", async () => {
  globalThis.fetch = aiDown;
  const out = await explainScenario({ scenario: savings() });
  assert.equal(out.source, "local");
  assert.match(out.answer, /₹24,000/);
  assert.match(out.notice, /without AI/);
});

test("ask: 'which variable matters most' still works without the AI; other questions fail politely", async () => {
  globalThis.fetch = aiDown;
  const local = await explainScenario({ scenario: savings(), question: "Which variable matters most?" });
  assert.equal(local.source, "local");
  assert.match(local.answer, /Monthly contribution/);

  await assert.rejects(
    () => explainScenario({ scenario: savings(), question: "Show me a more conservative scenario." }),
    (err) => err instanceof AiError && err.code === "overloaded"
  );
});

test("explain: bad or tampered scenarios are rejected before any AI call", async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; return aiSays({ answer: "x", changes: null })(); };

  const bad = [
    { scenario: { category: "weather", variables: [] } },
    { scenario: { ...savings(), variables: savings().variables.slice(0, 2) } },
    { scenario: savings(-5) },
    { scenario: savings(), question: "x".repeat(201) },
    { scenario: null },
  ];
  for (const input of bad) {
    await assert.rejects(() => explainScenario(input), (err) => err instanceof AiError && err.status === 400);
  }
  assert.equal(called, false);
});

test.after(() => { globalThis.fetch = realFetch; });