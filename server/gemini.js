// The only file that talks to Gemini. The API key never leaves the server.
// If the main model is overloaded (503), it retries once, then tries a backup model.

export class AiError extends Error {
  constructor(message, status = 502, code = "ai_error") {
    super(message);
    this.name = "AiError";
    this.status = status;
    this.code = code;
  }
}

const TIMEOUT_MS = 20000;
const RETRY_DELAY_MS = 1200;
const SERVER_ERRORS = new Set([500, 502, 503, 504]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// One HTTP call to one model. Throws AiError for timeouts and network failures.
async function requestModel(model, key, body) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new AiError("The AI service took too long to respond. Please try again.", 504, "timeout");
    }
    throw new AiError("Couldn't reach the AI service. Check your internet connection and try again.", 502, "network");
  } finally {
    clearTimeout(timer);
  }
}

async function readErrorDetail(res) {
  try {
    return (await res.json())?.error?.message || "";
  } catch {
    return "";
  }
}

export async function callGeminiJson({ system, user }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "your_gemini_api_key_here") {
    throw new AiError(
      "The AI service isn't configured. Add GEMINI_API_KEY to the .env file and restart the server.",
      503,
      "no_key"
    );
  }

  const primary = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const backup = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash-lite";
  const models = backup && backup !== primary ? [primary, backup] : [primary];

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens: 4096,
    },
  });

  let res = null;
  let detail = "";

  outer: for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      res = await requestModel(model, key, body);
      if (res.ok) break outer;

      detail = await readErrorDetail(res);
      // Log the reason on the server only; never log the key.
      console.error(`Gemini error ${res.status} (${model}, try ${attempt}): ${detail}`);

      if (SERVER_ERRORS.has(res.status)) {
        if (attempt === 1) await sleep(RETRY_DELAY_MS); // retry the same model once
        continue;
      }
      // 404 (model missing) or 429 (limit): a different model may still work
      if (res.status === 404 || res.status === 429) break;
      // Anything else (bad key, bad request): trying more models won't help
      break outer;
    }
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403 || /api key/i.test(detail)) {
      throw new AiError("The AI service rejected the API key. Check GEMINI_API_KEY in .env.", 502, "bad_key");
    }
    if (res.status === 404) {
      throw new AiError("The AI model name wasn't found. Check GEMINI_MODEL in .env.", 502, "bad_model");
    }
    if (res.status === 429) {
      throw new AiError("The AI service is busy or the free limit was reached. Wait a minute and try again.", 429, "rate_limited");
    }
    if (SERVER_ERRORS.has(res.status)) {
      throw new AiError("The AI service is overloaded right now. Please try again in a moment.", 503, "overloaded");
    }
    throw new AiError("The AI service returned an error. Please try again.", 502, "upstream");
  }

  const data = await res.json().catch(() => null);
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text || "")
    .join("")
    .trim()
    .replace(/^```(?:json)?\s*|\s*```$/g, "");

  if (!text) {
    throw new AiError("The AI returned an empty answer. Please try again.", 502, "empty");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new AiError("The AI's answer wasn't in the expected format. Please try again.", 502, "invalid_json");
  }
}