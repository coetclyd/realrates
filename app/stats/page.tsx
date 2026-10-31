import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { isConfigured } from '@/lib/supabase/env';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Site stats', robots: { index: false, follow: false } };

type Stats = {
  reports: number; reports_7d: number; companies_live: number; companies_live_yh: number; reports_yh: number;
  regions: number; visits_7d: number; submit_views_7d: number; visits_total: number; counting_since: string | null;
};

// Public, numbers-only progress page (totals, nothing identifying). Used by the weekly report.
export default async function StatsPage() {
  let s: Stats | null = null;
  let sources: { source: string; last_7d: number; total: number }[] | null = null;
  if (isConfigured()) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('site_stats');
    if (!error) s = data as Stats;
    // Optional: only present once the source-counts migration has been applied.
    const src = await supabase.rpc('source_stats');
    if (!src.error && Array.isArray(src.data)) sources = src.data;
  }
  if (!s || s.visits_7d === undefined) {
    return <div className="prose"><h1>Site stats</h1><p className="notice error">Stats not set up yet: run supabase/launch-setup.sql.</p></div>;
  }
  const conv = s.visits_7d > 0 ? ((s.reports_7d / s.visits_7d) * 100).toFixed(1) + '%' : 'n/a (no visits counted yet)';
  const rows: [string, string | number][] = [
    ['Rates shared (all time)', s.reports],
    ['Rates shared (last 7 days)', s.reports_7d],
    ['Rates in Yorkshire and the Humber', s.reports_yh],
    ['Companies live (3+ reports), UK', s.companies_live],
    ['Companies live, Yorkshire and the Humber', s.companies_live_yh],
    ['Regions with any rates', s.regions],
    ['Visits (last 7 days)', s.visits_7d],
    ['Rate-form views (last 7 days)', s.submit_views_7d],
    ['Rates per visit (last 7 days)', conv],
    ['Visits (all time)', s.visits_total],
    ['Counting visits since', s.counting_since ?? 'not yet'],
    ['Goal', '100 rates and 10 companies live'],
  ];
  return (
    <div className="prose">
      <h1>Site stats</h1>
      <div className="card table-wrap" style={{ padding: 0 }}>
        <table><tbody>{rows.map(([k, v]) => <tr key={k}><td>{k}</td><td className="num"><strong>{v}</strong></td></tr>)}</tbody></table>
      </div>
      {sources && (
        <>
          <h2>Where visits came from</h2>
          {sources.length === 0 ? <p className="muted">No tagged visits yet (links with ?utm_source=…).</p> : (
            <div className="card table-wrap" style={{ padding: 0 }}>
              <table>
                <thead><tr><th>Source</th><th className="num">Last 7 days</th><th className="num">All time</th></tr></thead>
                <tbody>{sources.map((r) => <tr key={r.source}><td>{r.source}</td><td className="num">{r.last_7d}</td><td className="num"><strong>{r.total}</strong></td></tr>)}</tbody>
              </table>
            </div>
          )}
        </>
      )}
      <p className="small muted">Visits = one per browser session, bots excluded, no personal data stored. Generated {new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })} UK time.</p>
    </div>
  );
}
