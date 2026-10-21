// ALL tax, NI, pension and allowance figures live here.
// Check and update these every April from GOV.UK before the new tax year starts.
// Figures below are for England, tax year 2026/27 (6 April 2026 to 5 April 2027).

export const TAX_YEAR = '2026/27';

export const INCOME_TAX = {
  personalAllowance: 12570, // tapers by £1 for every £2 earned over £100,000
  taperStart: 100000,
  // Bands apply to TAXABLE income (gross minus personal allowance), as HMRC defines them.
  bands: [
    { upTo: 37700, rate: 0.2 },     // basic rate (gross £12,571–£50,270 with full allowance)
    { upTo: 125140, rate: 0.4 },    // higher rate
    { upTo: Infinity, rate: 0.45 }, // additional rate
  ],
};

export const EMPLOYEE_NI = {
  primaryThreshold: 12570,
  upperEarningsLimit: 50270,
  mainRate: 0.08,
  upperRate: 0.02,
};

// Paid by the umbrella company out of the agency's assignment rate.
export const UMBRELLA = {
  employerNiRate: 0.15,
  secondaryThreshold: 5000,
  apprenticeshipLevyRate: 0.005,
  weeklyMarginDefault: 25, // £ per week, typical £20–£30
};

// Auto-enrolment pension on qualifying earnings.
export const PENSION = {
  defaultEmployeeRate: 0.05,
  lowerQualifying: 6240,
  upperQualifying: 50270,
};

// HMRC benchmark overnight subsistence for lorry drivers (tax and NI free up to these).
export const NIGHT_OUT = {
  withoutSleeperCab: 34.9,
  withSleeperCab: 26.2,
};

export const WEEKS_PER_YEAR = 52;
