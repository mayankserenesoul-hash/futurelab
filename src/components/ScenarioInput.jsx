import { EXAMPLES } from "../utils/examples.js";

const MAX_LENGTH = 300;

export default function ScenarioInput({ text, onChange, onAnalyze, loading, error }) {
  function handleSubmit(e) {
    e.preventDefault();
    onAnalyze(text);
  }

  // Ctrl+Enter (or Cmd+Enter on a Mac) analyzes without reaching for the mouse
  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (!loading) onAnalyze(text);
    }
  }

  return (
    <form className="panel scenario-input" onSubmit={handleSubmit}>
      <label htmlFor="scenario" className="eyebrow">What if...?</label>
      <textarea
        id="scenario"
        rows={3}
        maxLength={MAX_LENGTH}
        value={text}
        placeholder="What if I save ₹2000 every month for 12 months?"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-describedby="scenario-help scenario-error"
      />
      <div className="input-meta">
        <span id="scenario-help">{text.length}/{MAX_LENGTH} · Ctrl+Enter to analyze</span>
        <span id="scenario-error" className="error-text" role="alert">{error}</span>
      </div>

      <div className="input-actions">
        <button type="submit" className="btn" disabled={loading}>
          {loading ? "Analyzing…" : "Analyze Scenario"}
        </button>
        <div className="chips" role="group" aria-label="Example scenarios">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.id}
              type="button"
              className="chip"
              disabled={loading}
              onClick={() => {
                onChange(ex.text);
                onAnalyze(ex.text);
              }}
            >
              <span aria-hidden="true">{ex.icon}</span> {ex.label}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}