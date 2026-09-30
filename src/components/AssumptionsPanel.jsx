export default function AssumptionsPanel({ scenario }) {
  const aiAssumptions = scenario.aiAssumptions || [];

  return (
    <section className="panel" aria-labelledby="assump-title">
      <h2 id="assump-title" className="panel-title">Assumptions</h2>

      <p className="mono-label">Model</p>
      <p className="formula">{scenario.formula}</p>

      <ul className="check-list">
        {scenario.assumptions.map((a) => (
          <li key={a}>
            <span aria-hidden="true">✓</span> {a}
          </li>
        ))}
        {aiAssumptions.map((a) => (
          <li key={a}>
            <span aria-hidden="true">✓</span> {a}
            <span className="tag tag-ai">AI-generated assumption</span>
          </li>
        ))}
      </ul>

      <p className="hint">These assumptions can significantly affect the result.</p>
    </section>
  );
}
