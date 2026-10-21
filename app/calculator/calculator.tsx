'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { takeHome } from '@/lib/pay';
import { NIGHT_OUT, UMBRELLA, TAX_YEAR } from '@/lib/tax-config';

const gbp = (n: number) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const n = (v: string) => (v === '' ? 0 : Math.max(0, Number(v) || 0));

export default function Calculator() {
  const [f, setF] = useState({
    hourlyRate: '18.50', hoursPerWeek: '45', overtimeHours: '', overtimeRate: '',
    nightsOut: '', nightOutRate: String(NIGHT_OUT.withoutSleeperCab),
    route: 'paye' as 'paye' | 'umbrella', umbrellaMargin: String(UMBRELLA.weeklyMarginDefault), pension: true,
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const r = useMemo(() => takeHome({
    hourlyRate: n(f.hourlyRate), hoursPerWeek: n(f.hoursPerWeek),
    overtimeHours: n(f.overtimeHours), overtimeRate: n(f.overtimeRate),
    nightsOut: n(f.nightsOut), nightOutRate: n(f.nightOutRate),
    route: f.route, umbrellaMargin: n(f.umbrellaMargin), pension: f.pension,
  }), [f]);

  const overScale = n(f.nightOutRate) > NIGHT_OUT.withoutSleeperCab;

  return (
    <>
      <div className="card">
        <div className="field">
          <label>How are you paid?</label>
          <div className="choice-row">
            <label><input type="radio" name="route" checked={f.route === 'paye'} onChange={() => setF({ ...f, route: 'paye' })} /><span>PAYE (direct or agency)</span></label>
            <label><input type="radio" name="route" checked={f.route === 'umbrella'} onChange={() => setF({ ...f, route: 'umbrella' })} /><span>Umbrella company</span></label>
          </div>
          {f.route === 'umbrella' && (
            <span className="hint" style={{ marginTop: 6 }}>Enter the agency&apos;s rate to the umbrella. Employer NI, apprenticeship levy and the umbrella&apos;s margin come out before your gross pay.</span>
          )}
        </div>
        <div className="grid2">
          <div className="field"><label htmlFor="c-rate">{f.route === 'umbrella' ? 'Umbrella (assignment) rate £/hr' : 'Hourly rate £'}</label>
            <input id="c-rate" type="number" inputMode="decimal" step="0.01" value={f.hourlyRate} onChange={set('hourlyRate')} /></div>
          <div className="field"><label htmlFor="c-hours">Hours per week</label>
            <input id="c-hours" type="number" inputMode="decimal" step="0.5" value={f.hoursPerWeek} onChange={set('hoursPerWeek')} /></div>
          <div className="field"><label htmlFor="c-oth">Overtime hours per week</label>
            <input id="c-oth" type="number" inputMode="decimal" step="0.5" value={f.overtimeHours} onChange={set('overtimeHours')} /></div>
          <div className="field"><label htmlFor="c-otr">Overtime rate £/hr</label>
            <input id="c-otr" type="number" inputMode="decimal" step="0.01" value={f.overtimeRate} onChange={set('overtimeRate')} /></div>
          <div className="field"><label htmlFor="c-nights">Nights out per week</label>
            <input id="c-nights" type="number" inputMode="numeric" step="1" min="0" max="7" value={f.nightsOut} onChange={set('nightsOut')} /></div>
          <div className="field"><label htmlFor="c-nor">Night-out allowance £ per night</label>
            <input id="c-nor" type="number" inputMode="decimal" step="0.01" value={f.nightOutRate} onChange={set('nightOutRate')} /></div>
          {f.route === 'umbrella' && (
            <div className="field"><label htmlFor="c-margin">Umbrella margin £ per week</label>
              <input id="c-margin" type="number" inputMode="decimal" step="1" value={f.umbrellaMargin} onChange={set('umbrellaMargin')} /></div>
          )}
          <div className="field">
            <label>Workplace pension (5%)</label>
            <div className="choice-row">
              <label><input type="radio" name="pen" checked={f.pension} onChange={() => setF({ ...f, pension: true })} /><span>Yes</span></label>
              <label><input type="radio" name="pen" checked={!f.pension} onChange={() => setF({ ...f, pension: false })} /><span>No</span></label>
            </div>
          </div>
        </div>
        {overScale && (
          <p className="notice small">HMRC&apos;s tax-free benchmark is {gbp(NIGHT_OUT.withoutSleeperCab)} a night without a sleeper cab ({gbp(NIGHT_OUT.withSleeperCab)} with one). Anything above that is usually taxable, so this estimate may be too high.</p>
        )}
      </div>

      <h2>Your estimate</h2>
      <div className="calc-out" aria-live="polite">
        <div className="stat big"><div className="v">{gbp(r.weeklyNet)}</div><div className="k">Estimated take-home per week</div></div>
        <div className="stat"><div className="v">{gbp(r.monthlyNet)}</div><div className="k">Per month</div></div>
        <div className="stat"><div className="v">{gbp(r.annualNet)}</div><div className="k">Per year</div></div>
      </div>

      <div className="card table-wrap" style={{ marginTop: 12, padding: 0 }}>
        <table className="breakdown">
          <tbody>
            {f.route === 'umbrella' && (
              <>
                <tr><td>Assignment pay (to umbrella)</td><td>{gbp(r.annualAssignment)}</td></tr>
                <tr><td>Employer NI, levy and margin</td><td>−{gbp(r.employerCosts)}</td></tr>
              </>
            )}
            <tr><td>Gross pay</td><td>{gbp(r.annualGross)}</td></tr>
            <tr><td>Income tax</td><td>−{gbp(r.tax)}</td></tr>
            <tr><td>National Insurance</td><td>−{gbp(r.ni)}</td></tr>
            {f.pension && <tr><td>Pension (5%)</td><td>−{gbp(r.pension)}</td></tr>}
            {r.nightOuts > 0 && <tr><td>Night-out allowances (tax free)</td><td>+{gbp(r.nightOuts)}</td></tr>}
            <tr><td><strong>Take-home per year</strong></td><td><strong>{gbp(r.annualNet)}</strong></td></tr>
          </tbody>
        </table>
      </div>

      <p className="small muted" style={{ marginTop: 12 }}>
        Estimate only – not tax advice. Uses England {TAX_YEAR} rates, tax code 1257L, 52 working weeks, no student loan.
        Own Ltd company pay isn&apos;t covered because it depends on IR35 and how you take money out.
      </p>

      <section className="cta-band">
        <h2>Know what your agency pays?</h2>
        <p>Share it anonymously so other drivers can compare.</p>
        <Link href="/submit" className="btn">Share your rate</Link>
      </section>
    </>
  );
}
