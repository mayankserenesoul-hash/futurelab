import { Link } from "react-router-dom";
import HeroChart from "../components/HeroChart.jsx";
import { EXAMPLES } from "../utils/examples.js";

const STEPS = [
  { name: "Ask", text: "Type a what-if question in plain language." },
  { name: "Model", text: "AI picks a model type and extracts variables. It never runs code." },
  { name: "Simulate", text: "Fixed, deterministic functions do the actual math." },
  { name: "Visualize", text: "Interactive charts and key metrics show the outcome." },
  { name: "Explore", text: "Change variables, compare scenarios, ask follow-ups." },
];

const FEATURES = [
  { title: "Transparent models", text: "Every result comes with its formula, variables, and assumptions in plain view." },
  { title: "Editable variables", text: "Change any number and rerun. You are not stuck with the first answer." },
  { title: "Scenario comparison", text: "Overlay Scenario A and B on one chart to see what actually changes." },
  { title: "Reproducible results", text: "Calculations run in normal code, so the same inputs always give the same output." },
  { title: "Honest limitations", text: "Each simulation lists what the model does not account for." },
  { title: "Ask FutureLab", text: "Follow-up questions are answered using your actual simulation data." },
];

const LABELS = [
  { tag: "Fact", text: "Something established and verifiable." },
  { tag: "User input", text: "A number or choice you provided." },
  { tag: "Assumption", text: "A value we assume so the model can run." },
  { tag: "Calculated", text: "Output of a deterministic formula." },
  { tag: "AI interpretation", text: "AI-written explanation of the results." },
  { tag: "Estimate", text: "A hypothetical figure, not a forecast." },
];

export default function Landing() {
  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <p className="eyebrow">AI what-if simulation lab</p>
            <h1>Turn hypothetical ideas into interactive simulations.</h1>
            <p className="lead">
              Ask "What if?" Explore what could happen. FutureLab models your
              scenario with clear assumptions, then lets you change it and
              watch the outcome move.
            </p>
            <div className="hero-actions">
              <Link to="/lab" className="btn">Start Exploring</Link>
              <a href="#examples" className="btn btn-ghost">See Examples</a>
            </div>
          </div>
          <HeroChart />
        </div>
      </section>

      {/* EXAMPLES */}
      <section id="examples" className="section">
        <div className="container">
          <p className="eyebrow">Try it</p>
          <h2>Start from an example</h2>
          <div className="card-grid four">
            {EXAMPLES.map((ex) => (
              <Link
                key={ex.id}
                to={`/lab?q=${encodeURIComponent(ex.text)}`}
                className="card example-card"
              >
                <span className="example-icon" aria-hidden="true">{ex.icon}</span>
                <span className="mono-label">{ex.label}</span>
                <span className="example-text">{ex.text}</span>
                <span className="example-cta">Load in the Lab →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="section section-alt">
        <div className="container">
          <p className="eyebrow">How it works</p>
          <h2>Ask → Model → Simulate → Visualize → Explore</h2>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.name} className="step">
                <span className="step-num">{String(i + 1).padStart(2, "0")}</span>
                <h3>{s.name}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section">
        <div className="container">
          <p className="eyebrow">Features</p>
          <h2>Built to be understood, not just believed</h2>
          <div className="card-grid three">
            {FEATURES.map((f) => (
              <article key={f.title} className="card">
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ASSUMPTIONS */}
      <section className="section section-alt">
        <div className="container assumptions">
          <div>
            <p className="eyebrow">Assumptions</p>
            <h2>A simulation is only as good as its assumptions</h2>
            <p className="lead">
              FutureLab labels every piece of information so you always know
              where it came from. Results use language like "under these
              assumptions", never "this will happen".
            </p>
          </div>
          <ul className="label-list">
            {LABELS.map((l) => (
              <li key={l.tag}>
                <span className="pill">{l.tag}</span>
                <span>{l.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="section cta">
        <div className="container">
          <h2>What if…?</h2>
          <Link to="/lab" className="btn">Start Exploring</Link>
        </div>
      </section>
    </>
  );
}
