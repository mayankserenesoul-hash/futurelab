// Returns an error message for a variable, or "" if the value is fine.
export function validateVariable(variable) {
  const { value, min, max, label, integer } = variable;

  if (value === "" || value === null || value === undefined) {
    return `${label} is required.`;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return `${label} must be a valid number.`;
  }
  if (integer && !Number.isInteger(value)) {
    return `${label} must be a whole number.`;
  }
  if (value < min) return `${label} must be at least ${min}.`;
  if (value > max) return `${label} must be at most ${max.toLocaleString("en-IN")}.`;
  return "";
}

export function hasAnyErrors(variables) {
  return variables.some((v) => validateVariable(v) !== "");
}