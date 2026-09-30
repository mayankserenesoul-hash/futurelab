// Talks to our own backend. The browser never sees the AI key.

const OFFLINE = "Can't reach the FutureLab server. Check that it's running and try again.";
const UNEXPECTED = "The server sent an unexpected response. Please try again.";
const TOO_SLOW = "This is taking too long. The AI service may be busy, so please try again.";
const TIMEOUT_MS = 45000;

async function postJson(url, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") throw new Error(TOO_SLOW);
    throw new Error(OFFLINE);
  } finally {
    clearTimeout(timer);
  }

  let data = null;
  try {
    data = await res.json();
  } catch { /* the response wasn't JSON */ }

  if (!res.ok) {
    // A JSON error comes from our server. A non-JSON error is usually the dev proxy
    // reporting that the server isn't running.
    throw new Error(data?.error || (data === null ? OFFLINE : UNEXPECTED));
  }
  if (data === null) throw new Error(UNEXPECTED);
  return data;
}

export async function analyzeScenario(text) {
  const data = await postJson("/api/analyze", { text });
  if (!data?.scenario || !Array.isArray(data.scenario.variables)) throw new Error(UNEXPECTED);
  return data.scenario;
}

// question = null asks for a general explanation of the results
export async function explainScenario(scenario, question) {
  const data = await postJson("/api/explain", {
    scenario: {
      category: scenario.category,
      title: scenario.title,
      aiAssumptions: scenario.aiAssumptions || [],
      variables: scenario.variables.map((v) => ({ key: v.key, value: v.value, source: v.source })),
    },
    question: question || undefined,
  });
  if (typeof data.answer !== "string") throw new Error(UNEXPECTED);
  return data;
}