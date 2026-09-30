import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { analyzeScenario } from "./analyze.js";
import { explainScenario } from "./explain.js";
import { AiError } from "./gemini.js";
import { createWindowLimiter } from "./limits.js";

// Always load the .env from the project root, no matter where the server starts.
// (On a hosting service there is no .env file; the settings come from its dashboard instead.)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === "production";

app.disable("x-powered-by");
// Behind a hosting provider's proxy, trust exactly one hop so req.ip is the real visitor
app.set("trust proxy", 1);
// In production the website and the API share one address, so no cross-site access is needed
if (!isProd) app.use(cors());

// Security headers for every response. The Content-Security-Policy only allows our own
// scripts, plus Google Fonts for the text styles.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", CSP);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

// API answers are never cached
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.use(express.json({ limit: "10kb" }));

// Protect the AI key: a per-visitor limit, plus an overall hourly cap for the whole site
const perVisitor = createWindowLimiter({ max: 20, windowMs: 60 * 1000 });
const overall = createWindowLimiter({
  max: Number(process.env.AI_REQUESTS_PER_HOUR) || 300,
  windowMs: 60 * 60 * 1000,
});
function rateLimit(req, res, next) {
  if (!perVisitor.take(req.ip)) {
    return res
      .status(429)
      .json({ error: "Too many requests. Please wait a minute and try again.", code: "rate_limited" });
  }
  if (!overall.take("all")) {
    return res
      .status(429)
      .json({ error: "FutureLab is very busy right now. Please try again in a little while.", code: "busy" });
  }
  next();
}
setInterval(() => {
  perVisitor.prune();
  overall.prune();
}, 60 * 1000).unref();

function sendError(res, err) {
  if (err instanceof AiError) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }
  console.error("Unexpected error:", err);
  res.status(500).json({ error: "Something unexpected went wrong on the server.", code: "server_error" });
}

// Health check: used to verify frontend <-> backend connection (and by the hosting provider)
app.get("/api/health", (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  res.json({
    status: "ok",
    message: "FutureLab server is running",
    aiKeyConfigured: Boolean(key && key !== "your_gemini_api_key_here"),
  });
});

app.post("/api/analyze", rateLimit, async (req, res) => {
  try {
    const scenario = await analyzeScenario(req.body?.text);
    res.json({ scenario });
  } catch (err) {
    sendError(res, err);
  }
});

app.post("/api/explain", rateLimit, async (req, res) => {
  try {
    res.json(await explainScenario(req.body));
  } catch (err) {
    sendError(res, err);
  }
});

// Unknown API routes answer in JSON, not an HTML page
app.use("/api", (req, res) => {
  res.status(404).json({ error: "That API route doesn't exist.", code: "not_found" });
});

// The website itself: once `npm run build` has made the dist folder, this server serves it too
const distDir = path.join(__dirname, "..", "dist");
const indexHtml = path.join(distDir, "index.html");
const servesWebsite = fs.existsSync(indexHtml);
if (servesWebsite) {
  // Built asset files have unique names, so browsers may keep them for a year
  app.use("/assets", express.static(path.join(distDir, "assets"), { immutable: true, maxAge: "1y" }));
  app.use(express.static(distDir, { maxAge: "1h", index: false }));
  // Any other page address (like /lab) gets the app; a missing file (like /assets/x.js) gets a 404
  app.get("*", (req, res, next) => {
    if (path.extname(req.path)) return next();
    res.sendFile(indexHtml);
  });
}

app.use((req, res) => {
  res.status(404).type("text/plain").send("Not found");
});

// Bad or oversized request bodies also answer in JSON
app.use((err, req, res, next) => {
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "That request is too large.", code: "too_large" });
  }
  if (err?.type === "entity.parse.failed" || err instanceof SyntaxError) {
    return res.status(400).json({ error: "The request wasn't valid JSON.", code: "bad_json" });
  }
  console.error("Unexpected error:", err);
  res.status(500).json({ error: "Something unexpected went wrong on the server.", code: "server_error" });
});

app.listen(PORT, () => {
  console.log(`FutureLab server running on http://localhost:${PORT}`);
  console.log(
    servesWebsite
      ? "Serving the website and the API."
      : "Serving the API only. Run `npm run build` to serve the website from this server too."
  );
});