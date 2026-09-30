import { validateVariable, hasAnyErrors } from "../utils/validation.js";

export default function VariablesPanel({ variables, onChange, onRun }) {
  const blocked = hasAnyErrors(variables);

  return (
    <section className="panel" aria-labelledby="vars-title">
      <h2 id="vars-title" className="panel-title">Scenario variables</h2>

      <div className="var-grid">
        {variables.map((variable) => {
          const error = validateVariable(variable);
          const inputId = `var-${variable.key}`;
          return (
            <div key={variable.key} className="var-field">
              <div className="var-head">
                <label htmlFor={inputId}>{variable.label}</label>
                <span className={`tag ${variable.source === "user" ? "tag-user" : "tag-assumed"}`}>
                  {variable.source === "user" ? "User input" : "Assumption"}
                </span>
              </div>
              <div className="var-input">
                <input
                  id={inputId}
                  type="number"
                  inputMode="decimal"
                  step={variable.step}
                  value={variable.value}
                  aria-invalid={error ? "true" : "false"}
                  aria-describedby={error ? `${inputId}-err` : undefined}
                  onChange={(e) =>
                    onChange(variable.key, e.target.value === "" ? "" : Number(e.target.value))
                  }
                />
                <span className="unit">{variable.unit}</span>
              </div>
              {error && (
                <p id={`${inputId}-err`} className="error-text" role="alert">{error}</p>
              )}
            </div>
          );
        })}
      </div>

      <button type="button" className="btn" onClick={onRun} disabled={blocked}>
        Run Simulation
      </button>
      {blocked && <p className="hint">Fix the highlighted values to run the simulation.</p>}
    </section>
  );
}
