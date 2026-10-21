import test from 'node:test';
import assert from 'node:assert/strict';
import { incomeTax, employeeNI, pension, takeHome } from '../lib/pay.js';

// Reference figures match published 2026/27 payslip breakdowns (e.g. £45k: tax £6,486, NI £2,594.40, pension £1,938).
test('£45,000 PAYE matches published breakdown', () => {
  assert.equal(incomeTax(45000), 6486);
  assert.equal(employeeNI(45000), 2594.4);
  assert.equal(pension(45000), 1938);
});

test('£30,000 PAYE', () => {
  assert.equal(incomeTax(30000), 3486);
  assert.equal(employeeNI(30000), 1394.4);
  assert.equal(pension(30000), 1188);
});

test('£60,000 crosses higher rate and upper NI', () => {
  assert.equal(incomeTax(60000), 11432);
  assert.equal(employeeNI(60000), 3210.6);
});

test('personal allowance tapers away by £125,140', () => {
  // At £125,140 allowance is 0: 37,700 at 20% + (125,140 - 37,700) at 40%
  assert.equal(incomeTax(125140), 37700 * 0.2 + (125140 - 37700) * 0.4);
});

test('no tax or NI below the thresholds', () => {
  assert.equal(incomeTax(12000), 0);
  assert.equal(employeeNI(12000), 0);
});

test('PAYE take-home: £20/hr x 45hrs + 2 nights out at £34.90', () => {
  const r = takeHome({ hourlyRate: 20, hoursPerWeek: 45, nightsOut: 2, nightOutRate: 34.9, route: 'paye', pension: true });
  assert.equal(r.annualGross, 46800);
  assert.equal(r.nightOuts, 3629.6);
  const expected = 46800 - incomeTax(46800) - employeeNI(46800) - pension(46800) + 3629.6;
  assert.equal(r.annualNet, Math.round(expected * 100) / 100);
});

test('umbrella: gross + employer NI + levy + margin equals assignment', () => {
  const r = takeHome({ hourlyRate: 22, hoursPerWeek: 48, route: 'umbrella', umbrellaMargin: 25 });
  const assignment = 22 * 48 * 52;
  const rebuilt = r.annualGross + 0.15 * (r.annualGross - 5000) + 0.005 * r.annualGross + 25 * 52;
  assert.ok(Math.abs(rebuilt - assignment) < 0.05, `rebuilt ${rebuilt} vs ${assignment}`);
  assert.ok(r.annualNet < takeHome({ hourlyRate: 22, hoursPerWeek: 48, route: 'paye' }).annualNet);
});
