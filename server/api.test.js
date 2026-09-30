// Starts the real server as a separate process and talks to it over real HTTP.
// It never reaches Google: the API key is set to the placeholder, so every AI call is refused.
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = 5200 + Math.floor(Math.random() * 700);
const base = `http://127.0.0.1:${PORT}`;
let child;
let output = "";

test.before(async () => {
  child = spawn(process.execPath, ["index.js"], {
    cwd: here,
    env: { ...process.env, PORT: String(PORT), GEMINI_API_KEY: "your_gemini_api_key_here" },
  });
  child.stdout.on("data", (d) => (output += d));
  child.stderr.on("data", (d) => (output += d));
  await new Promise((resolve, reject) => {
    const giveUp = setTimeout(() => reject(new Error(`The server did not start:\n${output}`)), 10000);
    child.on("exit", () => reject(new Error(`The server exited early:\n${output}`)));
    const poll = () => {
      if (output.includes("running on")) {
        clearTimeout(giveUp);
        resolve();
      } else setTimeout(poll, 100);
    };
    poll();
  });
});

test.after(() => child?.kill());

const post = (route, body, { raw = false } = {}) =>
  fetch(base + route, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ? body : JSON.stringify(body),
  });

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

test("http: health check works and reports the key as not configured", async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, "ok");
  assert.equal(data.aiKeyConfigured, false);
});

test("http: analyze rejects empty and over-long text", async () => {
  let res = await post("/api/analyze", { text: "   " });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).code, "empty_input");

  res = await post("/api/analyze", { text: "x".repeat(301) });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).code, "too_long");
});

test("http: analyze with no AI key gives a clear 503, not a crash", async () => {
  const res = await post("/api/analyze", { text: "What if I save 2000 a month?" });
  assert.equal(res.status, 503);
  const data = await res.json();
  assert.equal(data.code, "no_key");
  assert.match(data.error, /isn't configured/);
});

test("http: malformed JSON, oversized bodies and unknown routes all answer in JSON", async () => {
  let res = await post("/api/analyze", "{bad", { raw: true });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).code, "bad_json");

  res = await post("/api/analyze", { text: "x".repeat(12000) });
  assert.equal(res.status, 413);
  assert.equal((await res.json()).code, "too_large");

  res = await fetch(`${base}/api/nope`);
  assert.equal(res.status, 404);
  assert.equal((await res.json()).code, "not_found");

  res = await fetch(`${base}/api/analyze`); // wrong method
  assert.equal(res.status, 404);
});

test("http: explain refuses tampered scenarios", async () => {
  for (const scenario of [{ category: "weather", variables: [] }, savings(-5), null]) {
    const res = await post("/api/explain", { scenario });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).code, "invalid_values");
  }
});

test("http: explain still answers from the engine's own numbers when the AI is unavailable", async () => {
  let res = await post("/api/explain", { scenario: savings() });
  assert.equal(res.status, 200);
  let data = await res.json();
  assert.equal(data.source, "local");
  assert.match(data.answer, /₹24,000/);

  res = await post("/api/explain", { scenario: savings(), question: "Which variable matters most?" });
  data = await res.json();
  assert.equal(data.source, "local");
  assert.match(data.answer, /Monthly contribution/);

  res = await post("/api/explain", { scenario: savings(), question: "Show me a more conservative scenario." });
  assert.equal(res.status, 503); // this one really needs the AI
});

test("http: the rate limit kicks in after 20 requests a minute (keep this test last)", async () => {
  const statuses = [];
  for (let i = 0; i < 30; i++) statuses.push((await post("/api/analyze", { text: "" })).status);
  assert.ok(statuses.includes(429), `no 429 seen: ${statuses.join(",")}`);
  const res = await post("/api/analyze", { text: "" });
  assert.equal((await res.json()).code, "rate_limited");
});