# FutureLab

**Ask "What if?" Explore what could happen.**

FutureLab turns a plain-language what-if question into a transparent, interactive simulation. You describe a scenario, the app picks a model and shows its assumptions, you change any number, and the results update on a chart. Every result is labelled as an illustrative simulation, never a prediction.

**Live demo:** [YOUR-LIVE-URL](https://futurelab-kfnd.onrender.com/)

## What makes it different

- **The AI never does the math.** It only reads your sentence and reports the numbers you actually wrote. Fixed, deterministic code runs every calculation, so the same inputs always give the same result.
- **Everything is labelled.** Each input is tagged *User input* or *Assumption*. Results are tagged *Calculated*. AI text is tagged *AI interpretation*. Estimates carry an *Illustrative simulation* label and a list of model limitations.
- **Explore, don't just read.** Edit any variable and re-run, pin up to three scenarios to compare them on one chart, or ask follow-up questions.
- **It still works when the AI doesn't.** The example scenarios load instantly with no AI call, and if the AI service is down, "Explain" and "Which variable matters most?" are answered from the engine's own numbers (clearly marked *Generated without AI*).

## Features

| Area | What you get |
|---|---|
| Scenario models | Personal finance (savings, optional growth), learning and habits, business customer growth, population growth, price change with break-even, and a generic custom model |
| Ask | Natural-language scenario in, structured and validated parameters out |
| Visuals | Line and bar charts with tooltips, key-metric cards, a values table, and scenario comparison (A, B, C) |
| Ask FutureLab | Plain-language explanation, "which variable matters most" (from engine test changes), and what-if questions where the **engine** calculates the new result |
| Sharing | Copy a link that reopens the exact scenario and result, and download a CSV |
| Quality | Keyboard-friendly, visible focus, reduced-motion support, WCAG AA text contrast, phone-friendly layout |

## How it works

```text
Browser (React)  ->  Express server  ->  Gemini API
   |                      |
   |  validated numbers   |  only extracts / explains
   v                      v
Deterministic simulation engine  (pure JavaScript, fully tested)
```

1. **Analyze:** the server asks Gemini to pick a category and extract only the numbers you wrote. The server checks the category, the keys and every range against its own templates (`shared/templates.js`). Unknown keys are dropped and out-of-range values fall back to defaults.
2. **Simulate:** the validated variables go to a predefined function (`simulateSavings`, `simulatePopulation`, and so on). No AI-generated code is ever executed.
3. **Explain:** for follow-up questions the server rebuilds the scenario itself and re-runs the engine, so the AI can only talk about real numbers. If the AI suggests changing an input, the engine calculates the outcome and shows it as a before/after card.

## Responsible AI

- Results use wording like "Under these assumptions..." and "The actual outcome may differ". The app never claims something *will* happen.
- Every simulation lists what the model does **not** account for.
- The AI receives untrusted user text with explicit instructions to ignore commands inside it, and its output is validated before use.
- The API key stays on the server and is never sent to the browser.

## Run it locally

You need Node.js 20.19 or newer (https://nodejs.org).

```powershell
npm install
npm --prefix server install
copy .env.example .env
```

Open `.env` and set `GEMINI_API_KEY` to your key (get one in Google AI Studio). Then:

```powershell
npm run dev:all
```

Open http://localhost:5173. The example buttons work even without a key.

### Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `GEMINI_API_KEY` | Your Gemini key (server only) | none |
| `GEMINI_MODEL` | Main model | `gemini-3.8-flash` |
| `GEMINI_FALLBACK_MODEL` | Used if the main model is overloaded | `gemini-3.5-flash-lite` |
| `AI_REQUESTS_PER_HOUR` | Site-wide cap on AI requests | `300` |
| `PORT` | Server port | `5000` |

### Scripts

| Command | What it does |
|---|---|
| `npm run dev:all` | Website and server together, for development |
| `npm test` | Unit tests: math, validation, insights, sharing, accessibility rules |
| `npm run test:api` | Starts the real server and tests it over HTTP |
| `npm run build` then `npm start` | Production mode: one server serves the site and the API on port 5000 |
| `npm run check` | Lint, all tests and a production build in one go |

## Deploy

`render.yaml` describes a one-service deployment on Render: create a Blueprint from this repository and paste `GEMINI_API_KEY` when asked. The free plan sleeps after 15 quiet minutes, so the first visit after a pause is slow.

## Project structure

```text
shared/templates.js     every scenario type: variables, ranges, assumptions, limitations
src/simulation/         deterministic models, comparison logic, insights
src/components/         React UI (Lab panels, charts, Ask FutureLab, share bar)
src/pages/              Landing and Lab
src/utils/              formatting, validation, share links, CSV, session history
server/                 Express API: analyze, explain, Gemini client, limiter
```

## Limitations

- Models are deliberately simple: constant rates, no inflation, fees, taxes, seasonality or costs unless stated. They illustrate, they do not forecast.
- The custom model is a generic percentage-growth model, so unusual scenarios are only roughly approximated.
- History lives in the browser session only. There are no accounts.
- On the free hosting plan the server sleeps when idle.