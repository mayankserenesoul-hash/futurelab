// Single source of truth for every scenario type.
// The server validates AI output against this file, and the simulation engine
// uses the same variable keys. No React or browser code here.

export const CATEGORY_IDS = ["finance", "learning", "business", "population", "pricing", "custom"];

const def = (key, label, dflt, unit, min, max, step, integer = false) => ({
  key, label, default: dflt, unit, min, max, step, integer,
});

export const TEMPLATES = {
  finance: {
    categoryLabel: "Personal Finance",
    title: "Regular savings",
    description: "saving a fixed amount regularly, optionally with a yearly growth rate",
    formula: "Each month: Balance = Balance × (1 + Annual rate ÷ 12) + Monthly contribution",
    variables: [
      def("monthly", "Monthly contribution", 2000, "₹", 0, 10000000, 100),
      def("months", "Duration", 12, "months", 1, 600, 1, true),
      def("start", "Starting balance", 0, "₹", 0, 100000000, 500),
      def("rate", "Annual growth rate", 0, "%", 0, 100, 0.5),
    ],
    assumptions: [
      "Monthly contribution stays constant",
      "Contributions are added at the end of each month",
      "Growth is compounded monthly from the annual rate (0% means no returns)",
      "No fees, taxes, or inflation are included",
    ],
    limitations: [
      "Does not include investment returns unless a growth rate is set",
      "Ignores inflation, fees, and taxes",
      "Assumes you never miss or change a contribution",
    ],
  },

  learning: {
    categoryLabel: "Learning / Habits",
    title: "Study habit",
    description: "practicing or studying a fixed number of hours on a regular schedule",
    formula: "Total hours = Hours per day × Days per month × Consistency × Months",
    variables: [
      def("hoursPerDay", "Hours per day", 2, "hours", 0, 24, 0.5),
      def("months", "Duration", 6, "months", 1, 120, 1, true),
      def("daysPerMonth", "Days per month", 30, "days", 1, 31, 1, true),
      def("consistency", "Consistency", 100, "%", 0, 100, 5),
    ],
    assumptions: [
      "Study time is the same every active day",
      "A month has 30 days unless changed",
      "Consistency of 100% means no missed days",
    ],
    limitations: [
      "Measures time spent, not how much you actually learn",
      "Does not model fatigue, motivation, or diminishing returns",
    ],
  },

  business: {
    categoryLabel: "Business",
    title: "Customer growth",
    description: "customers growing (or shrinking) by a percentage every month, with revenue per customer",
    formula: "Customers(month) = Starting customers × (1 + Growth%)^month",
    variables: [
      def("customers", "Starting customers", 100, "customers", 1, 100000000, 10),
      def("growth", "Monthly customer growth", 5, "%", -100, 1000, 0.5),
      def("months", "Duration", 12, "months", 1, 120, 1, true),
      def("revenuePer", "Revenue per customer", 500, "₹/month", 0, 10000000, 50),
    ],
    assumptions: [
      "Growth rate is the same every month",
      "Revenue per customer stays constant",
      "Costs are not included",
    ],
    limitations: [
      "Real growth usually slows as a market fills up",
      "Ignores costs, competition, and seasonality",
    ],
  },

  population: {
    categoryLabel: "Population / Growth",
    title: "Population growth",
    description: "a population growing by a fixed percentage every year",
    formula: "Population(year) = Starting population × (1 + Rate%)^year",
    variables: [
      def("population", "Starting population", 1000000, "people", 1, 10000000000, 1000),
      def("rate", "Annual growth rate", 2, "%", -50, 100, 0.1),
      def("years", "Duration", 20, "years", 1, 200, 1, true),
    ],
    assumptions: [
      "The growth rate is constant every year",
      "No migration shocks, wars, or resource limits",
      "A starting population of 1,000,000 is an example value unless you stated one",
    ],
    limitations: [
      "Real populations rarely grow at a constant rate forever",
      "Ignores carrying capacity, policy, and age structure",
    ],
  },

  pricing: {
    categoryLabel: "Business",
    title: "Price change",
    description: "changing a price by a percentage, possibly with a change in customer numbers",
    formula: "Revenue(month) = Price(month) × Customers(month), both changes phased in evenly",
    variables: [
      def("price", "Starting price", 100, "₹", 0, 10000000, 10),
      def("customers", "Starting customers", 1000, "customers", 1, 100000000, 50),
      def("priceChange", "Price change", 10, "%", -100, 1000, 1),
      def("customerChange", "Customer change", 0, "%", -100, 1000, 1),
      def("months", "Duration", 12, "months", 1, 120, 1, true),
    ],
    assumptions: [
      "Price and customer changes are phased in evenly over the period",
      "The starting price and customer count are example values unless you stated them",
      "Costs stay constant and are not included",
    ],
    limitations: [
      "Real customer reactions to price changes are uncertain and often uneven",
      "Ignores costs, competitors, and seasonality",
      "Shows revenue, not profit",
    ],
  },

  custom: {
    categoryLabel: "Custom Scenario",
    title: "Custom scenario",
    description: "anything else that can be described as a starting value changing by a percentage per period",
    formula: "Value(period) = Starting value × (1 + Change%)^period",
    variables: [
      def("start", "Starting value", 100, "units", 0, 1000000000, 10),
      def("change", "Change per period", 5, "%", -100, 1000, 0.5),
      def("periods", "Number of periods", 12, "periods", 1, 500, 1, true),
    ],
    assumptions: [
      "This scenario doesn't match a built-in category, so a generic growth model is used",
      "The value changes by the same percentage every period",
      "Values you didn't state are placeholders; please adjust them",
    ],
    limitations: [
      "This is a rough generic model, not tailored to your scenario",
      "Treat the output as a rough illustration only",
    ],
  },
};

function cleanList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((s) => typeof s === "string" && s.trim())
    .map((s) => s.trim().slice(0, 160))
    .slice(0, 4);
}

// Builds a full scenario from a category plus the numbers the user stated.
// Values that are missing or out of range fall back to the template default.
export function buildScenario(category, stated = {}, extras = {}) {
  const t = TEMPLATES[category];
  if (!t) throw new Error(`Unknown category: ${category}`);

  const warnings = [];
  const variables = t.variables.map((d) => {
    let value = d.default;
    let source = "assumption";
    const given = stated[d.key];

    if (typeof given === "number" && Number.isFinite(given)) {
      const candidate = d.integer ? Math.round(given) : given;
      if (candidate >= d.min && candidate <= d.max) {
        value = candidate;
        source = "user";
      } else {
        warnings.push(
          `${d.label} (${given}) was outside the allowed range, so the default of ${d.default} was used.`
        );
      }
    }
    return {
      key: d.key, label: d.label, value, unit: d.unit,
      min: d.min, max: d.max, step: d.step, integer: d.integer, source,
    };
  });

  const isCustom = category === "custom";
  const aiTitle = typeof extras.title === "string" ? extras.title.trim().slice(0, 60) : "";

  return {
    category,
    categoryLabel: t.categoryLabel,
    title: isCustom && aiTitle ? aiTitle : t.title,
    formula: t.formula,
    variables,
    assumptions: [...t.assumptions, ...warnings],
    aiAssumptions: isCustom ? cleanList(extras.assumptions) : [],
    limitations: t.limitations,
    isCustom,
  };
}
