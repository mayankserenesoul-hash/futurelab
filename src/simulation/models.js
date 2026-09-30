// The deterministic simulation functions.
// Each takes a plain object of values, e.g. { monthly: 2000, months: 12, ... }
// and returns { xLabel, durationLabel, series, data, metrics }.

import {
  getValue, round1, round2, wholePeriods, plural, pctChange, makeMetric,
} from "./helpers.js";

/* 1. PERSONAL FINANCE: regular savings, optional growth (monthly compounding) */
export function simulateSavings(values) {
  const monthly = getValue(values, "monthly");
  const months = wholePeriods(getValue(values, "months"));
  const start = getValue(values, "start");
  const monthlyRate = getValue(values, "rate") / 100 / 12;

  const data = [{ x: 0, balance: round2(start), contributed: round2(start) }];
  let balance = start;
  for (let m = 1; m <= months; m++) {
    balance = balance * (1 + monthlyRate) + monthly; // contribution added at month end
    data.push({
      x: m,
      balance: round2(balance),
      contributed: round2(start + monthly * m),
    });
  }

  const last = data[data.length - 1];
  return {
    xLabel: "Month",
    durationLabel: plural(months, "month"),
    series: [
      { key: "balance", label: "Balance", unit: "₹" },
      { key: "contributed", label: "Total contributed", unit: "₹" },
    ],
    data,
    metrics: [
      makeMetric("finalBalance", "Estimated balance", last.balance, { prefix: "₹" }),
      makeMetric("totalContributed", "Total contributed", last.contributed, { prefix: "₹" }),
      makeMetric("growthEarned", "Growth earned", round2(last.balance - last.contributed), { prefix: "₹" }),
    ],
  };
}

/* 2. LEARNING / HABITS: accumulated study time */
export function simulateLearning(values) {
  const hoursPerDay = getValue(values, "hoursPerDay");
  const months = wholePeriods(getValue(values, "months"));
  const daysPerMonth = getValue(values, "daysPerMonth");
  const consistency = getValue(values, "consistency") / 100;

  const perMonth = hoursPerDay * daysPerMonth * consistency;

  const data = [];
  for (let m = 0; m <= months; m++) {
    data.push({ x: m, hours: round2(perMonth * m) });
  }

  const total = data[data.length - 1].hours;
  return {
    xLabel: "Month",
    durationLabel: plural(months, "month"),
    series: [{ key: "hours", label: "Total study time", unit: "hours" }],
    data,
    metrics: [
      makeMetric("totalHours", "Total study time", total, { suffix: " hours" }),
      makeMetric("hoursPerMonth", "Average per month", round2(perMonth), { suffix: " hours" }),
      makeMetric("workingDays", "Same as 8-hour working days", round1(total / 8), { suffix: " days" }),
    ],
  };
}

/* 3. BUSINESS: compounding customer growth and revenue */
export function simulateBusiness(values) {
  const startCustomers = getValue(values, "customers");
  const growth = getValue(values, "growth") / 100;
  const months = wholePeriods(getValue(values, "months"));
  const revenuePer = getValue(values, "revenuePer");

  const data = [];
  let cumulativeRevenue = 0;
  for (let m = 0; m <= months; m++) {
    const customers = startCustomers * Math.pow(1 + growth, m);
    const revenue = customers * revenuePer;
    if (m >= 1) cumulativeRevenue += revenue;
    data.push({ x: m, customers: round2(customers), revenue: round2(revenue) });
  }

  const last = data[data.length - 1];
  return {
    xLabel: "Month",
    durationLabel: plural(months, "month"),
    series: [
      { key: "customers", label: "Customers", unit: "customers" },
      { key: "revenue", label: "Monthly revenue", unit: "₹/month" },
    ],
    data,
    metrics: [
      makeMetric("finalCustomers", "Customers at the end", last.customers, { suffix: " customers" }),
      makeMetric("finalRevenue", "Monthly revenue at the end", last.revenue, { prefix: "₹", suffix: "/month" }),
      makeMetric("totalRevenue", "Total revenue over the period", round2(cumulativeRevenue), { prefix: "₹" }),
      makeMetric("customerChange", "Customer change", pctChange(startCustomers, last.customers), { suffix: "%" }),
    ].filter((m) => m.value !== null),
  };
}

/* 4. POPULATION: constant percentage growth per year */
export function simulatePopulation(values) {
  const start = getValue(values, "population");
  const rate = getValue(values, "rate") / 100;
  const years = wholePeriods(getValue(values, "years"));

  const data = [];
  for (let y = 0; y <= years; y++) {
    data.push({ x: y, population: round2(start * Math.pow(1 + rate, y)) });
  }

  const last = data[data.length - 1];
  const metrics = [
    makeMetric("finalPopulation", "Population at the end", last.population, { suffix: " people" }),
    makeMetric("change", "Total change", pctChange(start, last.population), { suffix: "%" }),
  ];
  // Doubling time only exists for positive growth
  if (rate > 0) {
    metrics.push(
      makeMetric("doublingTime", "Time to double", round1(Math.log(2) / Math.log(1 + rate)), { suffix: " years" })
    );
  }

  return {
    xLabel: "Year",
    durationLabel: plural(years, "year"),
    series: [{ key: "population", label: "Population", unit: "people" }],
    data,
    metrics: metrics.filter((m) => m.value !== null),
  };
}

/* 5. CUSTOM / GENERIC: compounding change per period */
export function simulateGrowth(values) {
  const start = getValue(values, "start");
  const change = getValue(values, "change") / 100;
  const periods = wholePeriods(getValue(values, "periods"));

  const data = [];
  for (let p = 0; p <= periods; p++) {
    data.push({ x: p, value: round2(start * Math.pow(1 + change, p)) });
  }

  const last = data[data.length - 1];
  return {
    xLabel: "Period",
    durationLabel: plural(periods, "period"),
    series: [{ key: "value", label: "Value", unit: "units" }],
    data,
    metrics: [
      makeMetric("finalValue", "Value at the end", last.value, { suffix: " units" }),
      makeMetric("change", "Total change", pctChange(start, last.value), { suffix: "%" }),
    ].filter((m) => m.value !== null),
  };
}

/* 6. PRICING: price and customer changes phased in evenly, compared with no change */
export function simulatePricing(values) {
  const price = getValue(values, "price");
  const customers = getValue(values, "customers");
  const priceChange = getValue(values, "priceChange") / 100;
  const customerChange = getValue(values, "customerChange") / 100;
  const months = wholePeriods(getValue(values, "months"));

  const baseline = price * customers;
  let totalScenario = 0;
  let totalBaseline = 0;

  const data = [];
  for (let m = 0; m <= months; m++) {
    const progress = m / months; // 0 at the start, 1 at the end
    const revenue =
      price * (1 + priceChange * progress) * customers * (1 + customerChange * progress);
    if (m >= 1) {
      totalScenario += revenue;
      totalBaseline += baseline;
    }
    data.push({ x: m, baseline: round2(baseline), scenario: round2(revenue) });
  }

  const last = data[data.length - 1];
  const metrics = [
    makeMetric("finalRevenue", "Monthly revenue at the end", last.scenario, { prefix: "₹", suffix: "/month" }),
    makeMetric("revenueChange", "Change in monthly revenue", pctChange(baseline, last.scenario), { suffix: "%" }),
    makeMetric("totalDifference", "Total revenue vs. no change", round2(totalScenario - totalBaseline), { prefix: "₹" }),
  ];
  // The customer change at which revenue ends up exactly equal to the baseline
  if (priceChange > -1) {
    metrics.push(
      makeMetric("breakEven", "Break-even customer change", round1((-priceChange / (1 + priceChange)) * 100), { suffix: "%" })
    );
  }

  return {
    xLabel: "Month",
    durationLabel: plural(months, "month"),
    series: [
      { key: "baseline", label: "Without the change", unit: "₹/month" },
      { key: "scenario", label: "With the change", unit: "₹/month" },
    ],
    data,
    metrics: metrics.filter((m) => m.value !== null),
  };
}
