import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ScenarioInput from "../components/ScenarioInput.jsx";
import VariablesPanel from "../components/VariablesPanel.jsx";
import AssumptionsPanel from "../components/AssumptionsPanel.jsx";
import ResultsPanel from "../components/ResultsPanel.jsx";
import ShareBar from "../components/ShareBar.jsx";
import AskPanel from "../components/AskPanel.jsx";
import ComparePanel from "../components/ComparePanel.jsx";
import RecentScenarios from "../components/RecentScenarios.jsx";
import { analyzeScenario } from "../services/api.js";
import { findPreset } from "../services/presets.js";
import { runSimulation } from "../simulation/index.js";
import { pinScenario } from "../simulation/compare.js";
import { decodeScenario } from "../utils/share.js";
import { loadHistory, saveHistory } from "../utils/sessionHistory.js";

export default function Lab() {
  const [params] = useSearchParams();
  const [text, setText] = useState(params.get("q") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scenario, setScenario] = useState(null);
  const [result, setResult] = useState(null);
  const [runError, setRunError] = useState("");
  const [history, setHistory] = useState(() => loadHistory());
  const [pinned, setPinned] = useState([]);
  const [pinMessage, setPinMessage] = useState("");
  const [notice, setNotice] = useState("");
  const requestId = useRef(0);

  function clearResult() {
    setResult(null);
    setRunError("");
  }

  function remember(entry) {
    setHistory((prev) => [entry, ...prev.filter((h) => h.id !== entry.id)].slice(0, 6));
  }

  async function analyze(input) {
    const clean = input.trim();
    if (!clean) {
      setError("Please describe a scenario first.");
      return;
    }

    const id = ++requestId.current;
    setLoading(true);
    setError("");
    setNotice("");
    clearResult();

    try {
      // Preset examples load instantly from our own templates; anything else uses the AI.
      const analyzed = findPreset(clean) ?? (await analyzeScenario(clean));
      if (id !== requestId.current) return; // a newer request replaced this one
      setScenario(analyzed);
      remember({ id: clean, text: clean, scenario: analyzed });
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  // On arrival: open a shared link (?s=...) or analyze a landing-page example (?q=...)
  useEffect(() => {
    const shared = params.get("s");
    if (shared) {
      const decoded = decodeScenario(shared);
      if (!decoded) {
        setError("That shared link isn't valid or is out of date.");
        return;
      }
      setScenario(decoded);
      setText(decoded.originalText);
      try {
        setResult(runSimulation(decoded));
      } catch (err) {
        setRunError(err instanceof Error ? err.message : "The simulation could not be run.");
      }
      remember({ id: decoded.originalText, text: decoded.originalText, scenario: decoded });
      return;
    }
    const q = params.get("q");
    if (q) analyze(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recent scenarios survive a page refresh (for this browser session)
  useEffect(() => {
    saveHistory(history);
  }, [history]);

  // After a run, bring the results into view if they are off-screen (common on phones)
  useEffect(() => {
    if (!result) return;
    const heading = document.getElementById("results-title");
    if (!heading) return;
    const rect = heading.getBoundingClientRect();
    if (rect.top > window.innerHeight * 0.6 || rect.bottom < 0) {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      heading.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    }
  }, [result]);

  function updateVariable(key, value) {
    clearResult(); // old results no longer match the edited variables
    setPinMessage("");
    setNotice("");
    setScenario((s) => ({
      ...s,
      variables: s.variables.map((v) => (v.key === key ? { ...v, value } : v)),
    }));
  }

  function runNow() {
    setPinMessage("");
    setNotice("");
    try {
      setResult(runSimulation(scenario));
      setRunError("");
    } catch (err) {
      setResult(null);
      setRunError(err instanceof Error ? err.message : "The simulation could not be run.");
    }
  }

  // "Load these values" from Ask FutureLab: put the suggested numbers into the variables
  function applyChanges(changes) {
    clearResult();
    setPinMessage("");
    setNotice("Values loaded from Ask FutureLab. Click Run Simulation to see the new result.");
    setScenario((s) => ({
      ...s,
      variables: s.variables.map((v) => {
        const change = changes.find((c) => c.key === v.key);
        return change ? { ...v, value: change.to, source: "user" } : v;
      }),
    }));
  }

  function openFromHistory(item) {
    requestId.current++; // cancel any in-flight analysis
    setLoading(false);
    setText(item.text);
    setScenario(item.scenario);
    setError("");
    setNotice("");
    setPinMessage("");
    clearResult();
  }

  function pinCurrent() {
    const outcome = pinScenario(pinned, scenario, result);
    if (outcome.error) {
      setPinMessage(outcome.error);
    } else {
      setPinned(outcome.pinned);
      setPinMessage("");
    }
  }

  function removePinned(letter) {
    setPinned((list) => list.filter((p) => p.letter !== letter));
    setPinMessage("");
  }

  function clearPinned() {
    setPinned([]);
    setPinMessage("");
  }

  return (
    <div className="container lab">
      <header className="lab-header">
        <p className="eyebrow">Simulation Lab</p>
        <h1>Ask a what-if question</h1>
      </header>

      <ScenarioInput
        text={text}
        onChange={setText}
        onAnalyze={analyze}
        loading={loading}
        error={error}
      />

      <div className="lab-grid">
        <div className="lab-main">
          <div aria-live="polite" className="sr-only">
            {loading
              ? "Analyzing scenario"
              : result
              ? "Simulation complete"
              : scenario
              ? "Scenario ready"
              : ""}
          </div>

          {loading ? (
            <section className="panel skeleton" aria-busy="true">
              <div className="skeleton-line wide" />
              <div className="skeleton-line" />
              <div className="skeleton-line" />
              <div className="skeleton-line" />
              <p className="hint">Identifying variables and assumptions…</p>
            </section>
          ) : scenario ? (
            <>
              <p className="scenario-summary">
                <span className="mono-label">{scenario.categoryLabel}</span>
                <strong>{scenario.title}</strong>
              </p>
              {notice && <p className="notice" role="status">{notice}</p>}
              <div className="model-grid">
                <VariablesPanel
                  variables={scenario.variables}
                  onChange={updateVariable}
                  onRun={runNow}
                />
                <AssumptionsPanel scenario={scenario} />
              </div>
            </>
          ) : null}

          <ResultsPanel
            scenario={loading ? null : scenario}
            result={result}
            error={runError}
          />

          {!loading && scenario && result && <ShareBar scenario={scenario} result={result} />}

          {!loading && scenario && result && (
            <AskPanel scenario={scenario} result={result} onApply={applyChanges} />
          )}

          {!loading && (scenario || pinned.length > 0) && (
            <ComparePanel
              pinned={pinned}
              hasResult={Boolean(result)}
              message={pinMessage}
              onPin={pinCurrent}
              onRemove={removePinned}
              onClear={clearPinned}
            />
          )}
        </div>

        <RecentScenarios items={history} activeId={scenario?.originalText} onOpen={openFromHistory} />
      </div>
    </div>
  );
}