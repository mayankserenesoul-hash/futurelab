import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.join(here, rel), "utf8");
const globalCss = read("global.css");
const labCss = read("lab.css");

const lin = (c) => {
  c /= 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
};
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

function token(css, name) {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(m, `colour token --${name} not found`);
  return m[1];
}
const t = (name) => token(globalCss, name);
const WHITE = "#ffffff";

test("contrast: theme colours used for text meet WCAG AA (4.5:1)", () => {
  const pairs = [
    ["ink on page", t("ink"), t("bg")],
    ["ink on card", t("ink"), t("card")],
    ["muted on page", t("muted"), t("bg")],
    ["muted on alt section", t("muted"), t("bg-alt")],
    ["muted on card", t("muted"), t("card")],
    ["muted on white", t("muted"), WHITE],
    ["accent-dark on page", t("accent-dark"), t("bg")],
    ["accent-dark on alt section", t("accent-dark"), t("bg-alt")],
    ["accent-dark on card", t("accent-dark"), t("card")],
    ["white on accent (buttons)", WHITE, t("accent")],
    ["white on accent-dark (hover)", WHITE, t("accent-dark")],
    ["warm on card", t("warm"), t("card")],
    ["warm on page", t("warm"), t("bg")],
    ["white on ink (skip link)", WHITE, t("ink")],
  ];
  for (const [name, fg, bg] of pairs) {
    assert.ok(ratio(fg, bg) >= 4.5, `${name}: ${ratio(fg, bg).toFixed(2)}`);
  }
});

test("contrast: tag, error and pin colours in lab.css meet AA, and are really in the file", () => {
  const literal = [
    ["tag user", "#0b5a54", "#d5efe9"],
    ["tag assumption", "#9a3412", "#fbe6d8"],
    ["tag AI", "#4c3fa3", "#e4e0f5"],
    ["tag calculated", "#1e4e8c", "#dfe9f5"],
    ["tag local", "#55636d", "#e7e5dc"],
    ["error text on card", "#b91c1c", t("card")],
    ["error text on white", "#b91c1c", WHITE],
    ["calc label on page", "#1e4e8c", t("bg")],
  ];
  for (const [name, fg, bg] of literal) {
    assert.ok(ratio(fg, bg) >= 4.5, `${name}: ${ratio(fg, bg).toFixed(2)}`);
    for (const colour of [fg, bg]) {
      const themeColours = [t("card"), t("bg"), t("accent-dark"), WHITE];
      if (themeColours.includes(colour)) continue; // defined once in global.css
      assert.ok(labCss.toLowerCase().includes(colour), `${name}: ${colour} is no longer in lab.css, update this test`);
    }
  }
  for (const pin of ["#0f766e", "#c2410c", "#4c3fa3"]) assert.ok(ratio(WHITE, pin) >= 4.5, pin);
});

test("contrast: form field borders and the focus ring meet the 3:1 rule for UI components", () => {
  const border = token(labCss, "field-border");
  assert.ok(ratio(border, WHITE) >= 3, `border on white: ${ratio(border, WHITE).toFixed(2)}`);
  assert.ok(ratio(border, t("card")) >= 3, "border on card");
  assert.ok(ratio(t("warm"), t("bg")) >= 3, "focus ring on page");
  assert.ok(ratio(t("warm"), WHITE) >= 3, "focus ring on white");
});

test("accessibility basics are in place", () => {
  const html = read("../../index.html");
  assert.match(html, /<html lang="en"/);
  assert.match(html, /name="viewport"/);
  assert.match(globalCss, /prefers-reduced-motion: reduce/);
  assert.match(globalCss, /:focus-visible/);
  assert.match(globalCss, /\.skip-link/);
  assert.match(labCss, /max-width: 600px/);
  assert.match(labCss, /min-height: 44px/);
  assert.match(read("../App.jsx"), /tabIndex=\{-1\}/);
});