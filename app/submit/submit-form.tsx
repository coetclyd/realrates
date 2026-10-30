'use client';

import { useActionState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { submitRate, type FormState } from '../actions';
import { REGIONS, LICENCES, JOB_TYPES, SHIFTS, PAY_ROUTES, SITE_NAME } from '@/lib/options';
import ShareButtons from '../share-buttons';

function Choices({ name, options, required = true }: { name: string; options: readonly { value: string; label: string }[]; required?: boolean }) {
  return (
    <div className="choice-row" role="radiogroup">
      {options.map((o, i) => (
        <label key={o.value}>
          <input type="radio" name={name} value={o.value} required={required && i === 0} />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
}

export default function SubmitForm({ companies, siteUrl }: { companies: { name: string }[]; siteUrl: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitRate, {});
  const formRef = useRef<HTMLFormElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
    if (state.ok || state.error) topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [state]);

  return (
    <>
      <div ref={topRef} />
      {state.ok && (
        <div className="notice success" role="status" style={{ marginBottom: 16 }}>
          <strong>{state.message}</strong>{' '}
          <Link href="/">See the rates</Link> or add another below.
          <ShareButtons
            url={siteUrl}
            label="Each company needs 3 drivers before its rates show. Send it to your mates:"
            text={`I've just put what my agency pays on ${SITE_NAME} – anonymous, takes a minute. Add yours so we can all see who pays fair:`}
          />
        </div>
      )}
      {state.error && <div className="notice error" role="alert" style={{ marginBottom: 16 }}>{state.error}</div>}

      <form ref={formRef} action={action} className="card">
        <div className="field">
          <label htmlFor="company_name">Agency or haulier name</label>
          <input id="company_name" name="company_name" list="company-list" autoComplete="off" required maxLength={80} placeholder="Start typing…" />
          <datalist id="company-list">
            {companies.map((c) => <option key={c.name} value={c.name} />)}
          </datalist>
          <span className="hint">Pick from the list if it&apos;s there. New names are checked before they go live.</span>
        </div>
        <div className="field">
          <label>Is it an agency or a haulier?</label>
          <Choices name="kind" options={[{ value: 'agency', label: 'Agency' }, { value: 'haulier', label: 'Direct haulier' }]} />
        </div>

        <div className="grid2">
          <div className="field">
            <label htmlFor="region">Region</label>
            <select id="region" name="region" required defaultValue="">
              <option value="" disabled>Choose…</option>
              {REGIONS.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="site_town">Site town <span className="hint">e.g. Hull, Goole (optional)</span></label>
            <input id="site_town" name="site_town" maxLength={60} />
          </div>
          <div className="field">
            <label htmlFor="postcode_area">Postcode area <span className="hint">Letters only, e.g. HU (optional)</span></label>
            <input id="postcode_area" name="postcode_area" maxLength={2} pattern="[A-Za-z]{1,2}" style={{ textTransform: 'uppercase' }} />
          </div>
          <div className="field">
            <label htmlFor="client_name">Client company <span className="hint">Who the agency sent you to (optional)</span></label>
            <input id="client_name" name="client_name" maxLength={80} />
          </div>
        </div>

        <div className="field">
          <label>Licence</label>
          <Choices name="licence" options={LICENCES} />
        </div>
        <div className="field">
          <label>Job type</label>
          <Choices name="job_type" options={JOB_TYPES} />
        </div>
        <div className="field">
          <label>Shift</label>
          <Choices name="shift" options={SHIFTS} />
        </div>

        <div className="grid2">
          <div className="field">
            <label htmlFor="hourly_rate">Base hourly rate (£)</label>
            <input id="hourly_rate" name="hourly_rate" type="number" inputMode="decimal" step="0.01" min="10" max="60" required placeholder="e.g. 18.50" />
          </div>
          <div className="field">
            <label htmlFor="overtime_rate">Overtime rate (£) <span className="hint">Optional</span></label>
            <input id="overtime_rate" name="overtime_rate" type="number" inputMode="decimal" step="0.01" min="10" max="90" />
          </div>
          <div className="field">
            <label htmlFor="night_out">Night-out allowance (£) <span className="hint">Optional, per night</span></label>
            <input id="night_out" name="night_out" type="number" inputMode="decimal" step="0.01" min="0" max="100" />
          </div>
          <div className="field">
            <label htmlFor="worked_month">Month worked</label>
            <input id="worked_month" name="worked_month" type="month" max={thisMonth} defaultValue={thisMonth} required />
          </div>
        </div>

        <div className="field">
          <label>How were you paid?</label>
          <Choices name="pay_route" options={PAY_ROUTES} />
        </div>
        <div className="field">
          <label>Were shifts cancelled at short notice?</label>
          <Choices name="cancellations" options={[{ value: 'never', label: 'Never' }, { value: 'sometimes', label: 'Sometimes' }, { value: 'often', label: 'Often' }]} />
        </div>
        <div className="field">
          <label>Paid correctly and on time?</label>
          <Choices name="paid_correctly" options={[{ value: 'yes', label: 'Yes' }, { value: 'mostly', label: 'Mostly' }, { value: 'no', label: 'No' }]} />
        </div>

        <div className="field">
          <label htmlFor="comment">
            Comment <span className="hint">Optional, max 300 characters. Don&apos;t name individuals or include phone numbers – comments naming people won&apos;t be published.</span>
          </label>
          <textarea id="comment" name="comment" maxLength={300} />
        </div>

        <button className="btn block" disabled={pending}>{pending ? 'Saving…' : 'Share my rate anonymously'}</button>
        <p className="small muted" style={{ marginTop: 10 }}>
          Your email is never shown. Figures only appear once 3 drivers have reported for a company. See our <Link href="/privacy">privacy policy</Link>.
        </p>
      </form>
    </>
  );
}
