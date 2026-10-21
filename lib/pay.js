import { INCOME_TAX, EMPLOYEE_NI, UMBRELLA, PENSION, WEEKS_PER_YEAR } from './tax-config.js';

const round2 = (n) => Math.round(n * 100) / 100;

export function incomeTax(annualGross) {
  let allowance = INCOME_TAX.personalAllowance;
  if (annualGross > INCOME_TAX.taperStart) {
    allowance = Math.max(0, allowance - (annualGross - INCOME_TAX.taperStart) / 2);
  }
  const taxable = Math.max(0, annualGross - allowance);
  let tax = 0;
  let lower = 0;
  for (const band of INCOME_TAX.bands) {
    if (taxable > lower) tax += (Math.min(taxable, band.upTo) - lower) * band.rate;
    lower = band.upTo;
  }
  return round2(tax);
}

export function employeeNI(annualGross) {
  const { primaryThreshold: pt, upperEarningsLimit: uel, mainRate, upperRate } = EMPLOYEE_NI;
  let ni = 0;
  if (annualGross > pt) ni += (Math.min(annualGross, uel) - pt) * mainRate;
  if (annualGross > uel) ni += (annualGross - uel) * upperRate;
  return round2(ni);
}

export function pension(annualGross, rate = PENSION.defaultEmployeeRate) {
  const qualifying = Math.max(0, Math.min(annualGross, PENSION.upperQualifying) - PENSION.lowerQualifying);
  return round2(qualifying * rate);
}

/**
 * Estimate take-home pay.
 * @param {object} i
 * @param {number} i.hourlyRate        base hourly rate (£)
 * @param {number} i.hoursPerWeek      normal hours per week
 * @param {number} [i.overtimeHours]   overtime hours per week
 * @param {number} [i.overtimeRate]    overtime hourly rate (£)
 * @param {number} [i.nightsOut]       nights out per week
 * @param {number} [i.nightOutRate]    £ paid per night out (tax free up to HMRC scale)
 * @param {'paye'|'umbrella'} i.route  'paye' = direct or agency PAYE; 'umbrella' = umbrella company
 * @param {number} [i.umbrellaMargin]  £ per week kept by umbrella
 * @param {boolean} [i.pension]        include 5% auto-enrolment pension
 */
export function takeHome(i) {
  const weeklyPay = (i.hourlyRate || 0) * (i.hoursPerWeek || 0) + (i.overtimeHours || 0) * (i.overtimeRate || 0);
  let annualAssignment = weeklyPay * WEEKS_PER_YEAR;
  let employerCosts = 0;
  let annualGross = annualAssignment;

  if (i.route === 'umbrella') {
    // Assignment rate covers umbrella margin, employer NI and apprenticeship levy before gross pay.
    const margin = (i.umbrellaMargin ?? UMBRELLA.weeklyMarginDefault) * WEEKS_PER_YEAR;
    const pot = Math.max(0, annualAssignment - margin);
    const { employerNiRate: r, secondaryThreshold: st, apprenticeshipLevyRate: l } = UMBRELLA;
    // Solve gross G where G + r*(G - st) + l*G = pot  (when G > st)
    let g = (pot + r * st) / (1 + r + l);
    if (g <= st) g = pot / (1 + l);
    annualGross = round2(g);
    employerCosts = round2(annualAssignment - annualGross);
  }

  const tax = incomeTax(annualGross);
  const ni = employeeNI(annualGross);
  const pen = i.pension ? pension(annualGross) : 0;
  const nightOutsAnnual = (i.nightsOut || 0) * (i.nightOutRate || 0) * WEEKS_PER_YEAR;
  const annualNet = round2(annualGross - tax - ni - pen + nightOutsAnnual);

  return {
    annualAssignment: round2(annualAssignment),
    employerCosts,
    annualGross,
    tax, ni, pension: pen,
    nightOuts: round2(nightOutsAnnual),
    annualNet,
    monthlyNet: round2(annualNet / 12),
    weeklyNet: round2(annualNet / WEEKS_PER_YEAR),
  };
}
