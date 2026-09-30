// Turns a preset example into a full scenario without calling the AI.
import { EXAMPLES } from "../utils/examples.js";
import { buildScenario } from "../../shared/templates.js";

const normalize = (s) => s.trim().replace(/\s+/g, " ").toLowerCase();

// Returns a scenario if the text is exactly one of the presets, otherwise null.
export function findPreset(text) {
  if (typeof text !== "string") return null;
  const example = EXAMPLES.find((e) => normalize(e.text) === normalize(text));
  if (!example) return null;
  return { ...buildScenario(example.category, example.stated), originalText: text.trim() };
}