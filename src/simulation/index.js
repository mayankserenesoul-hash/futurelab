// The single entry point the UI uses: runSimulation(scenario)
// It validates, picks the right model, runs it, and checks the output is safe.

import { validateVariable } from "../utils/validation.js";
import { SimulationError, toValues, assertResultIsSafe } from "./helpers.js";
import {
  simulateSavings, simulateLearning, simulateBusiness,
  simulatePopulation, simulateGrowth, simulatePricing,
} from "./models.js";

const MODELS = {
  finance: simulateSavings,
  learning: simulateLearning,
  business: simulateBusiness,
  population: simulatePopulation,
  pricing: simulatePricing,
  custom: simulateGrowth,
};

export { SimulationError };

export function runSimulation(scenario) {
  if (!scenario || !Array.isArray(scenario.variables)) {
    throw new SimulationError("There is no scenario to simulate.");
  }

  const model = MODELS[scenario.category];
  if (!model) {
    throw new SimulationError("This type of scenario is not supported yet.");
  }

  // Never trust input, even from our own UI or the AI.
  for (const variable of scenario.variables) {
    const problem = validateVariable(variable);
    if (problem) throw new SimulationError(problem);
  }

  const values = toValues(scenario.variables);
  const output = model(values);
  assertResultIsSafe(output);

  return { category: scenario.category, ...output };
}
