// Turns a scenario into a short link code and back. No server involved.
// Format:  category~key:value:u,key:value:a,...   (u = user input, a = assumption)
// Decoding rebuilds the scenario from our own templates, so a hand-edited link can
// never inject anything: unknown keys are ignored and out-of-range values are refused.

import { CATEGORY_IDS, TEMPLATES, buildScenario } from "../../shared/templates.js";

const MAX_CODE_LENGTH = 400;

export function encodeScenario(scenario) {
  const vars = scenario.variables
    .map((v) => `${v.key}:${v.value}:${v.source === "user" ? "u" : "a"}`)
    .join(",");
  return `${scenario.category}~${vars}`;
}

// Returns a full scenario, or null if the code isn't valid.
export function decodeScenario(code) {
  if (typeof code !== "string" || code.length === 0 || code.length > MAX_CODE_LENGTH) return null;

  const [category, rest, ...extra] = code.split("~");
  if (extra.length || !CATEGORY_IDS.includes(category) || !rest) return null;

  const stated = Object.create(null);
  const origin = Object.create(null);
  for (const part of rest.split(",")) {
    const [key, raw, flag, ...more] = part.split(":");
    if (more.length || !key || raw === undefined || raw.trim() === "") return null;
    const value = Number(raw);
    if (!Number.isFinite(value)) return null;
    stated[key] = value;
    origin[key] = flag === "a" ? "assumption" : "user";
  }

  const template = TEMPLATES[category];
  if (!template.variables.every((d) => d.key in stated)) return null;

  const scenario = buildScenario(category, stated);
  // buildScenario adds a warning when a value is out of range: refuse instead of guessing
  if (scenario.assumptions.length > template.assumptions.length) return null;

  for (const v of scenario.variables) v.source = origin[v.key];
  return { ...scenario, originalText: `Shared scenario: ${scenario.title}` };
}