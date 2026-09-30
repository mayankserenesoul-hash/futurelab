// Preset scenarios. Used by the landing page and the Lab.
// "category" and "stated" let the Lab load them instantly, without calling the AI.
export const EXAMPLES = [
  {
    id: "savings",
    icon: "💰",
    label: "Savings",
    text: "What if I save ₹2000 every month for 12 months?",
    category: "finance",
    stated: { monthly: 2000, months: 12 },
  },
  {
    id: "learning",
    icon: "📚",
    label: "Learning",
    text: "What if I study 2 hours every day for 6 months?",
    category: "learning",
    stated: { hoursPerDay: 2, months: 6 },
  },
  {
    id: "business",
    icon: "🏢",
    label: "Business",
    text: "What if my customers grow 5% every month?",
    category: "business",
    stated: { growth: 5 },
  },
  {
    id: "population",
    icon: "🌍",
    label: "Population",
    text: "What if a population grows by 2% per year for 20 years?",
    category: "population",
    stated: { rate: 2, years: 20 },
  },
];