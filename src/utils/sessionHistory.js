// Keeps recent scenarios for the current browser session, so a page refresh doesn't lose them.
// Everything read back is checked, because stored data can be edited by anyone.
import { CATEGORY_IDS } from "../../shared/templates.js";

const KEY = "futurelab.history.v1";
const MAX_ITEMS = 6;

function browserStorage() {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null; // storage can be blocked by browser settings
  }
}

const isText = (x) => typeof x === "string";
const isNumber = (x) => typeof x === "number" && Number.isFinite(x);

function validItem(item) {
  const s = item?.scenario;
  return (
    isText(item?.id) && isText(item?.text) && item.text.length <= 300 &&
    s && CATEGORY_IDS.includes(s.category) &&
    isText(s.categoryLabel) && isText(s.title) && isText(s.formula) &&
    Array.isArray(s.assumptions) && s.assumptions.every(isText) &&
    Array.isArray(s.limitations) && s.limitations.every(isText) &&
    Array.isArray(s.variables) && s.variables.length > 0 &&
    s.variables.every(
      (v) =>
        v && isText(v.key) && isText(v.label) && isText(v.unit) &&
        isNumber(v.min) && isNumber(v.max) && isNumber(v.step) && isNumber(v.value)
    )
  );
}

export function loadHistory(storage = browserStorage()) {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(KEY));
    return Array.isArray(parsed) ? parsed.filter(validItem).slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

export function saveHistory(items, storage = browserStorage()) {
  if (!storage) return;
  try {
    storage.setItem(KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    /* storage full or blocked: history just won't survive a refresh */
  }
}