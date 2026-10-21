import Link from 'next/link';
import { LICENCES, JOB_TYPES, SHIFTS, REGIONS, money, monthYear } from '@/lib/options';

export type SearchRow = {
  company_id: string;
  name: string;
  slug: string;
  kind: 'agency' | 'haulier';
  areas: string | null;
  reports: number;
  median_rate: number;
  min_rate: number;
  max_rate: number;
  last_report: string;
};

export function Filters({ values, action = '/' }: { values: Record<string, string | undefined>; action?: string }) {
  return (
    <form className="filters" method="get" action={action} role="search">
      {action === '/' && (
        <div>
          <label htmlFor="f-region">Region</label>
          <select id="f-region" name="region" defaultValue={values.region ?? ''}>
            <option value="">All UK</option>
            {REGIONS.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
          </select>
        </div>
      )}
      <div>
        <label htmlFor="f-licence">Licence</label>
        <select id="f-licence" name="licence" defaultValue={values.licence ?? ''}>
          <option value="">Any</option>
          {LICENCES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="f-job">Job type</label>
        <select id="f-job" name="job" defaultValue={values.job ?? ''}>
          <option value="">Any</option>
          {JOB_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="f-shift">Shift</label>
        <select id="f-shift" name="shift" defaultValue={values.shift ?? ''}>
          <option value="">Any</option>
          {SHIFTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div className="full">
        <button className="btn block" type="submit">Show rates</button>
      </div>
    </form>
  );
}

export function Results({ rows }: { rows: SearchRow[] }) {
  if (!rows.length) {
    return (
      <div className="notice">
        <strong>No companies to show for that search yet.</strong>
        <p className="small muted" style={{ margin: '4px 0 0' }}>
          A company only appears once at least 3 drivers have reported a rate, so no one can be identified.{' '}
          <Link href="/submit">Add yours</Link> to get it started.
        </p>
      </div>
    );
  }
  return (
    <div className="stack">
      {rows.map((r) => (
        <Link key={r.company_id} href={`/company/${r.slug}`} className="card result">
          <div>
            <div className="name">{r.name}</div>
            <div className="small muted">{r.areas}</div>
            <div style={{ marginTop: 6 }}>
              <span className="tag">{r.kind === 'agency' ? 'Agency' : 'Haulier'}</span>
              <span className="tag">{r.reports} reports</span>
              <span className="tag">Latest {monthYear(r.last_report)}</span>
            </div>
          </div>
          <div className="rate num">
            {money(r.median_rate)}
            <small>median /hr · {money(r.min_rate)}–{money(r.max_rate)}</small>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function ShareBand() {
  return (
    <section className="cta-band">
      <h2>Know what your agency pays?</h2>
      <p>Takes 60 seconds, fully anonymous. Every rate helps the next driver avoid a bad deal.</p>
      <Link href="/submit" className="btn">Share your rate</Link>
    </section>
  );
}

export function NotConfigured() {
  return (
    <div className="notice error">
      <strong>Database not connected yet.</strong>
      <p className="small" style={{ margin: '4px 0 0' }}>
        Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to your environment variables, then redeploy.
      </p>
    </div>
  );
}
