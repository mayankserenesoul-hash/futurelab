import { formatMetric, formatNumber } from "../utils/format.js";
import ResultChart from "./ResultChart.jsx";

export default function ResultsPanel({ scenario, result, error }) {
  return (
    <section className="panel results" aria-labelledby="results-title">
      <h2 id="results-title" className="panel-title">Results</h2>

      {!scenario ? (
        <div className="empty">
          <p className="empty-title">Nothing to simulate yet</p>
          <p>Describe a what-if scenario above, or click an example, and your results will appear here.</p>
        </div>
      ) : error ? (
        <div className="empty">
          <p className="empty-title">This simulation couldn't run</p>
          <p className="error-text" role="alert">{error}</p>
        </div>
      ) : !result ? (
        <div className="empty">
          <p className="empty-title">Ready to simulate</p>
          <p>Review the variables and assumptions, then click Run Simulation.</p>
        </div>
      ) : (
        <ResultView scenario={scenario} result={result} />
      )}
    </section>
  );
}

function ResultView({ scenario, result }) {
  const primary = result.metrics[0];

  return (
    <div>
      <span className="chart-tag">Illustrative simulation</span>

      <p className="result-headline">
        Under these assumptions, after {result.durationLabel}, this simulation shows:
        <span className="big">{formatMetric(primary)}</span>
        <span>{primary.label}</span>
      </p>

      <ResultChart result={result} />

      <div className="metric-grid">
        {result.metrics.map((m) => (
          <div key={m.key} className="metric">
            <p className="metric-label">{m.label}</p>
            <p className="metric-value">{formatMetric(m)}</p>
            <span className="tag tag-calc">Calculated</span>
          </div>
        ))}
      </div>

      <div className="limits">
        <p className="mono-label">Model limitations</p>
        <ul>
          {scenario.limitations.map((l) => <li key={l}>{l}</li>)}
        </ul>
        <p className="hint">This is a hypothetical estimate. The actual outcome may differ.</p>
      </div>

      <details>
        <summary>View the values behind the result</summary>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">{result.xLabel}</th>
                {result.series.map((s) => (
                  <th scope="col" key={s.key}>{s.label} ({s.unit})</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.data.map((row) => (
                <tr key={row.x}>
                  <td>{row.x}</td>
                  {result.series.map((s) => (
                    <td key={s.key}>{formatNumber(row[s.key])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
