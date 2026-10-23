import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isConfigured } from '@/lib/supabase/env';
import { JOB_TYPES, LICENCES, label, money, monthYear } from '@/lib/options';
import { ShareBand, NotConfigured } from '../../components';
import ReportButton from './report-button';
import ShareButtons from '../../share-buttons';
import { SITE_URL } from '@/lib/options';

export const dynamic = 'force-dynamic';

type Detail = {
  id: string; name: string; slug: string; kind: 'agency' | 'haulier'; reports: number;
  stats: null | {
    median: number; min: number; max: number; median_night_out: number | null;
    pct_paid_correctly: number; pct_often_cancelled: number; last_report: string; areas: string | null;
  };
  breakdown: { licence: string; job_type: string; reports: number; median: number; min: number; max: number }[];
};
type Comment = { id: string; body: string; worked_month: string; licence: string; job_type: string };
type Params = Promise<{ slug: string }>;

async function load(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc('company_detail', { p_slug: slug });
  return { supabase, detail: data as Detail | null };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  if (!isConfigured()) return {};
  const { slug } = await params;
  const { detail } = await load(slug);
  if (!detail) return { title: 'Company not found' };
  const s = detail.stats;
  return {
    title: `${detail.name} HGV driver pay rates – real driver reports`,
    description: s
      ? `${detail.name} pays a median ${money(s.median)}/hr based on ${detail.reports} anonymous HGV driver reports. See rates by licence and job type.`
      : `Anonymous HGV driver pay reports for ${detail.name}. Add yours.`,
    alternates: { canonical: `/company/${detail.slug}` },
  };
}

export default async function CompanyPage({ params }: { params: Params }) {
  if (!isConfigured()) return <NotConfigured />;
  const { slug } = await params;
  const { supabase, detail } = await load(slug);
  if (!detail) notFound();

  const { data: commentData } = detail.stats
    ? await supabase.rpc('public_comments', { p_company: detail.id })
    : { data: [] };
  const comments = (commentData as Comment[]) ?? [];
  const s = detail.stats;

  return (
    <>
      <p className="small"><Link href="/">← All rates</Link></p>
      <h1>{detail.name}</h1>
      <p>
        <span className="tag">{detail.kind === 'agency' ? 'Agency' : 'Direct haulier'}</span>
        <span className="tag">{detail.reports} driver {detail.reports === 1 ? 'report' : 'reports'}</span>
        {s && <span className="tag">Latest {monthYear(s.last_report)}</span>}
      </p>

      {!s ? (
        <div className="notice">
          <strong>Not enough reports yet.</strong>
          <p className="small muted" style={{ margin: '4px 0 0' }}>
            We show figures once at least 3 drivers have reported, so nobody can be identified.
            {detail.reports > 0 && ` ${3 - detail.reports} more needed.`} <Link href="/submit">Add yours</Link>.
          </p>
        </div>
      ) : (
        <>
          {s.areas && <p className="muted">Reported sites: {s.areas}</p>}
          <div className="stats">
            <div className="stat big"><div className="v">{money(s.median)}</div><div className="k">Median hourly rate</div></div>
            <div className="stat"><div className="v">£{Math.round(Number(s.min))}–£{Math.round(Number(s.max))}</div><div className="k">Range reported</div></div>
            <div className="stat"><div className="v">{s.pct_paid_correctly}%</div><div className="k">Paid correctly and on time</div></div>
            <div className="stat"><div className="v">{s.pct_often_cancelled}%</div><div className="k">Say shifts often cancelled</div></div>
          </div>
          {s.median_night_out !== null && (
            <p className="muted small" style={{ marginTop: 10 }}>Median night-out allowance reported: {money(s.median_night_out)}</p>
          )}

          {detail.breakdown.length > 0 && (
            <>
              <h2>By licence and job type</h2>
              <div className="table-wrap card" style={{ padding: 0 }}>
                <table>
                  <thead><tr><th>Licence</th><th>Job</th><th>Median</th><th>Range</th><th>Reports</th></tr></thead>
                  <tbody>
                    {detail.breakdown.map((b) => (
                      <tr key={b.licence + b.job_type}>
                        <td>{label(LICENCES, b.licence)}</td>
                        <td>{label(JOB_TYPES, b.job_type)}</td>
                        <td><strong>{money(b.median)}</strong></td>
                        <td>{money(b.min)}–{money(b.max)}</td>
                        <td>{b.reports}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="small muted">Rows only appear with 3 or more reports.</p>
            </>
          )}

          <h2>What drivers say</h2>
          {comments.length === 0 ? (
            <p className="muted">No comments yet.</p>
          ) : (
            <div className="stack">
              {comments.map((c) => (
                <div key={c.id} className="card">
                  <p style={{ marginBottom: 6 }}>{c.body}</p>
                  <div className="small muted">
                    {label(LICENCES, c.licence)} · {label(JOB_TYPES, c.job_type)} · {monthYear(c.worked_month)}
                  </div>
                  <ReportButton commentId={c.id} />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <ShareButtons
        url={`${SITE_URL}/company/${detail.slug}`}
        label={s ? 'Know someone working for them?' : `Help get ${detail.name} on the board`}
        text={s
          ? `${detail.name} – real HGV pay reported by drivers (median ${money(s.median)}/hr). What are you on?`
          : `Anyone driving for ${detail.name}? Add what they pay (anonymous) so we can all see a fair rate:`}
      />

      <ShareBand />
      <p className="small muted" style={{ marginTop: 20 }}>
        Rates are reported anonymously by drivers and haven&apos;t been verified by {detail.name}. Think something here is
        wrong? <Link href={`/contact?company=${encodeURIComponent(detail.name)}`}>Request a review</Link>.
      </p>
    </>
  );
}
