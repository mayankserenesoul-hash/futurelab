import test from "node:test";
import assert from "node:assert/strict";
import { analyzeScenario, explainScenario } from "./api.js";

const realFetch = globalThis.fetch;
const reply = (status, body, isJson = true) => async () => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => {
    if (!isJson) throw new SyntaxError("not json");
    return body;
  },
});

const scenario = { category: "finance", title: "t", variables: [{ key: "monthly", value: 1, source: "user" }] };

test("api: server offline (network error) gives a clear message", async () => {
  globalThis.fetch = async () => { throw new TypeError("fetch failed"); };
  await assert.rejects(() => analyzeScenario("x"), /Can't reach the FutureLab server/);
});

test("api: a proxy error page (not JSON) is treated as the server being unreachable", async () => {
  globalThis.fetch = reply(500, null, false);
  await assert.rejects(() => analyzeScenario("x"), /Can't reach the FutureLab server/);
});

test("api: the server's own error message is shown as-is", async () => {
  globalThis.fetch = reply(422, { error: "FutureLab can't model this yet: aliens." });
  await assert.rejects(() => analyzeScenario("x"), /can't model this yet: aliens/);
});

test("api: a 200 answer that isn't valid data is reported, not crashed on", async () => {
  globalThis.fetch = reply(200, { nothing: true });
  await assert.rejects(() => analyzeScenario("x"), /unexpected response/);
  globalThis.fetch = reply(200, null, false);
  await assert.rejects(() => explainScenario(scenario, null), /unexpected response/);
});

test("api: a request that is aborted says it took too long", async () => {
  globalThis.fetch = async () => { const e = new Error("aborted"); e.name = "AbortError"; throw e; };
  await assert.rejects(() => explainScenario(scenario, "q"), /taking too long/);
});

test("api: a good explain answer is passed through", async () => {
  globalThis.fetch = reply(200, { answer: "Under these assumptions...", comparison: null, source: "ai" });
  const out = await explainScenario(scenario, "q");
  assert.equal(out.source, "ai");
});

test.after(() => { globalThis.fetch = realFetch; });