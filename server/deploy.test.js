// Starts the real server in production mode (twice) and checks what a public visitor would get.
// It never reaches Google: the API key is the placeholder, so every AI call is refused.
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, "..", "dist");
const hasSite = existsSync(path.join(dist, "index.html"));

function startServer(extraEnv = {}) {
  const port = 5900 + Math.floor(Math.random() * 90);
  let output = "";
  const child = spawn(process.execPath, ["index.js"], {
    cwd: here,
    env: { ...process.env, NODE_ENV: "production", PORT: String(port), GEMINI_API_KEY: "your_gemini_api_key_here", ...extraEnv },
  });
  child.stdout.on("data", (d) => (output += d));
  child.stderr.on("data", (d) => (output += d));
  const ready = new Promise((resolve, reject) => {
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
  return { base: `http://127.0.0.1:${port}`, ready, stop: () => child.kill() };
}

const main = startServer();
const capped = startServer({ AI_REQUESTS_PER_HOUR: "3" });
test.before(async () => { await Promise.all([main.ready, capped.ready]); });
test.after(() => { main.stop(); capped.stop(); });

test("production: security headers are on every response", async () => {
  const res = await fetch(`${main.base}/api/health`);
  const h = res.headers;
  assert.equal(h.get("x-content-type-options"), "nosniff");
  assert.equal(h.get("x-frame-options"), "DENY");
  assert.equal(h.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.equal(h.get("x-powered-by"), null);
  assert.match(h.get("content-security-policy"), /default-src 'self'/);
  assert.match(h.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.equal(h.get("cache-control"), "no-store");
});

test("production: other websites are not given cross-site access", async () => {
  const res = await fetch(`${main.base}/api/health`, { headers: { Origin: "https://evil.example" } });
  assert.equal(res.headers.get("access-control-allow-origin"), null);
});

test("production: the website is served, and unknown API routes stay JSON", { skip: !hasSite && "run `npm run build` first" }, async () => {
  for (const route of ["/", "/lab", "/some/deep/page"]) {
    const res = await fetch(main.base + route);
    assert.equal(res.status, 200, route);
    assert.match(res.headers.get("content-type"), /text\/html/);
    assert.match(await res.text(), /<div id="root">/);
  }
  const api = await fetch(`${main.base}/api/nope`);
  assert.equal(api.status, 404);
  assert.equal((await api.json()).code, "not_found");
});

test("production: a missing file is a real 404, not the app page", { skip: !hasSite && "run `npm run build` first" }, async () => {
  const res = await fetch(`${main.base}/assets/does-not-exist.js`);
  assert.equal(res.status, 404);
  assert.doesNotMatch(res.headers.get("content-type"), /text\/html/);
});

test("production: built assets are cached for a year", { skip: !hasSite && "run `npm run build` first" }, async () => {
  const file = readdirSync(path.join(dist, "assets")).find((f) => f.endsWith(".js"));
  assert.ok(file, "no built .js file found in dist/assets");
  const res = await fetch(`${main.base}/assets/${file}`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("cache-control"), /max-age=31536000/);
  assert.match(res.headers.get("cache-control"), /immutable/);
});

test("production: an overall hourly cap protects the AI key", async () => {
  const post = () =>
    fetch(`${capped.base}/api/analyze`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "" }) });
  const statuses = [];
  for (let i = 0; i < 5; i++) statuses.push((await post()).status);
  assert.deepEqual(statuses, [400, 400, 400, 429, 429]);
  const last = await post();
  assert.equal((await last.json()).code, "busy");
});