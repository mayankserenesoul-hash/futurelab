import { useEffect, useRef, useState } from "react";
import { explainScenario } from "../services/api.js";
import { formatMetric } from "../utils/format.js";
import { formatDelta, withUnit } from "../simulation/compare.js";

const QUICK_QUESTIONS = [
  "Which variable matters most?",
  "Show me a more conservative scenario.",
  "What could make this result wrong?",
];
const MAX_LENGTH = 200;

function Paragraphs({ text }) {
  return text
    .split("\n")
    .filter(Boolean)
    .map((line, i) => <p key={i}>{line}</p>);
}

function ChangeCard({ comparison, onApply }) {
  return (
    <div className="ask-compare">
      <p className="mono-label">Calculated by the simulation engine</p>
      <p className="ask-changed">
        Changed:{" "}
        {comparison.changes
          .map((c) => `${c.label} ${withUnit(c.from, c.unit)} → ${withUnit(c.to, c.unit)}`)
          .join(", ")}
      </p>
      <div className="table-wrap compare-table-wrap">
        <table className="data-table compare-table">
          <caption className="sr-only">Current result compared with the changed inputs</caption>
          <thead>
            <tr>
              <th scope="col">Result</th>
              <th scope="col">Current</th>
              <th scope="col">With the change</th>
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((row) => (
              <tr key={row.key}>
                <th scope="row">{row.label}</th>
                <td>{formatMetric(row.before)}</td>
                <td>
                  {row.after ? formatMetric(row.after) : "—"}
                  {row.after && <span className="delta">{formatDelta(row.before, row.after, "current")}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="btn btn-small" onClick={() => onApply(comparison.changes)}>
        Load these values into the variables
      </button>
    </div>
  );
}

export default function AskPanel({ scenario, result, onApply }) {
  const [thread, setThread] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  // A new simulation result means the old answers no longer match
  useEffect(() => {
    requestId.current++;
    setThread([]);
    setError("");
    setLoading(false);
  }, [result]);

  async function ask(text) {
    const clean = text.trim();
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const reply = await explainScenario(scenario, clean || null);
      if (id !== requestId.current) return;
      setThread((t) => [...t, { id, question: clean, ...reply }]);
      if (clean) setQuestion("");
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!question.trim()) {
      setError("Type a question first, or pick one of the suggestions.");
      return;
    }
    ask(question);
  }

  return (
    <section className="panel ask" aria-labelledby="ask-title">
      <h2 id="ask-title" className="panel-title">Ask FutureLab</h2>
      <p className="hint ask-intro">
        The AI only explains numbers the simulation engine has already calculated. It never does the math itself.
      </p>

      <div className="ask-actions">
        <button type="button" className="btn btn-small" onClick={() => ask("")} disabled={loading}>
          Explain these results
        </button>
        <div className="chips" role="group" aria-label="Suggested questions">
          {QUICK_QUESTIONS.map((q) => (
            <button key={q} type="button" className="chip" disabled={loading} onClick={() => ask(q)}>
              {q}
            </button>
          ))}
        </div>
      </div>

      <form className="ask-form" onSubmit={handleSubmit}>
        <label htmlFor="ask-input" className="sr-only">Ask a follow-up question</label>
        <input
          id="ask-input"
          type="text"
          value={question}
          maxLength={MAX_LENGTH}
          placeholder="What changes if I save ₹3000?"
          onChange={(e) => setQuestion(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="btn btn-small" disabled={loading}>
          {loading ? "Thinking…" : "Ask"}
        </button>
      </form>

      <p className="error-text" role="alert">{error}</p>
      <div aria-live="polite" className="sr-only">{loading ? "FutureLab is thinking" : thread.length ? `Answer ${thread.length} added below.` : ""}</div>

      {thread.map((item) => (
        <article key={item.id} className="ask-item">
          {item.question && (
            <p className="ask-q">
              <span className="mono-label">You asked</span> {item.question}
            </p>
          )}
          <div className="ask-answer">
            <span className={`tag ${item.source === "ai" ? "tag-ai" : "tag-local"}`}>
              {item.source === "ai" ? "AI interpretation" : "Generated without AI"}
            </span>
            <div className="ask-text">
              <Paragraphs text={item.answer} />
            </div>
            {item.notice && <p className="hint">{item.notice}</p>}
            {item.comparison && <ChangeCard comparison={item.comparison} onApply={onApply} />}
          </div>
        </article>
      ))}
    </section>
  );
}