// Decorative but honest: two savings scenarios computed with the same simple formula.
const W = 480;
const H = 300;
const PAD = 40;
const MONTHS = 12;
const MAX = 36000;

function buildPath(monthly) {
  const points = [];
  for (let m = 0; m <= MONTHS; m++) {
    const x = PAD + (m / MONTHS) * (W - PAD * 2);
    const y = H - PAD - ((monthly * m) / MAX) * (H - PAD * 2);
    points.push(`${m === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return points.join(" ");
}

export default function HeroChart() {
  const gridY = [0, 0.25, 0.5, 0.75, 1];
  return (
    <figure className="hero-chart">
      <div className="chart-tag">Illustrative simulation</div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Line chart comparing saving 2,000 rupees per month, ending at 24,000, with saving 3,000 rupees per month, ending at 36,000, over 12 months."
      >
        {gridY.map((g) => {
          const y = H - PAD - g * (H - PAD * 2);
          return (
            <g key={g}>
              <line x1={PAD} x2={W - PAD} y1={y} y2={y} className="chart-grid" />
              <text x={PAD - 8} y={y + 4} textAnchor="end" className="chart-label">
                {Math.round((g * MAX) / 1000)}k
              </text>
            </g>
          );
        })}
        <path d={buildPath(2000)} className="chart-line chart-line-a" pathLength="1" />
        <path d={buildPath(3000)} className="chart-line chart-line-b" pathLength="1" />
        <text x={W - PAD} y={H - PAD - (24000 / MAX) * (H - PAD * 2) + 18} textAnchor="end" className="chart-label chart-label-a">
          A · ₹2,000/mo → ₹24,000
        </text>
        <text x={W - PAD} y={H - PAD - (36000 / MAX) * (H - PAD * 2) - 8} textAnchor="end" className="chart-label chart-label-b">
          B · ₹3,000/mo → ₹36,000
        </text>
        <text x={PAD} y={H - 12} className="chart-label">month 0</text>
        <text x={W - PAD} y={H - 12} textAnchor="end" className="chart-label">month 12</text>
      </svg>
      <figcaption>Balance = starting balance + monthly saving × months. No returns, fees, or inflation.</figcaption>
    </figure>
  );
}
