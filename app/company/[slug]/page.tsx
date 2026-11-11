import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isConfigured } from '@/lib/supabase/env';
import { JOB_TYPES, LICENCES, label, money, monthYear, workLabel, kindLabel } from '@/lib/options';
import { ShareBand, NotConfigured } from '../../components';
import ReportButton from './report-button';
import ShareButtons from '../../share-buttons';
import { SITE_URL } from '@/lib/options';

export const dynamic = 'force-dynamic';

type Stats = {
  median: number; min: number; max: number; median_night_out: number | null;
  pct_paid_correctly: number; pct_often_cancelled: number; last_report: string; areas: string | null;
};
// One section per kind of work with 3+ reports. Reports of different kinds of work are never pooled.
type Section = Stats & { work_type: string; reports: number };
type Detail = {
  id: string; name: string; slug: string; kind: 'agency' | 'haulier' | 'employer'; reports: number;
  sections?: Section[]; // added by the work-types migration
  stats: null | Stats;  // HGV only after the migration
  breakdown: { licence: string; job_type: string; reports: number; median: number; min: number; max: number }[];
};
type Comment = { id: string; body: string; worked_month: string; licence: string | null; job_type: string | null; work_type?: string };
type Params = Promise<{ slug: string }>;

async function load(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc('company_detail', { p_slug: slug });
  return { supabase, detail: data as Detail | null };
}

// Before the migration there is no 'sections' key: every report was HGV, so 'stats' is the HGV section.
function sectionsOf(d: Detail): Section[] {
  if (d.sections) return d.sections;
  return d.stats ? [{ ...d.stats, work_type: 'hgv', reports: d.reports }] : [];
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  if (!isConfigured()) return {};
  const { slug } = await params;
  const { detail } = await load(slug);
  if (!detail) return { title: 'Company not found' };
  const top = sectionsOf(detail)[0];
  return {
    title: `${detail.name} pay rates – real worker reports`,
    description: top
      ? `${detail.name} – ${workLabel(top.work_type)}: median ${money(top.median)}/hr from ${top.reports} anonymous reports. Compare shift pay on ShiftRates.`
      : `Anonymous pay reports from shift workers at ${detail.name}. Add yours.`,
    alternates: { canonical: `/company/${detail.slug}` },
  };
}

function SectionStats({ s }: { s: Section }) {
  return (
    <>
      {s.areas && <p className="muted">Reported sites: {s.areas}</p>}
      <div className="stats">
        <div className="stat big"><div className="v">{money(s.median)}</div><div className="k">Median hourly rate</div></div>
        <div className="stat"><div className="v">£{Math.round(Number(s.min))}–£{Math.round(Number(s.max))}</div><div className="k">Range reported</div></div>
        <div className="stat"><div className="v">{s.pct_paid_correctly}%</div><div className="k">Paid correctly and on time</div></div>
        <div className="stat"><div className="v">{s.pct_often_cancelled}%</div><div className="k">Say shifts often cancelled</div></div>
      </div>
      {s.work_type === 'hgv' && s.median_night_out !== null && (
        <p className="muted small" style={{ marginTop: 10 }}>Median night-out allowance reported: {money(s.median_night_out)}</p>
      )}
    </>
  );
}

export default async function CompanyPage({ params }: { params: Params }) {
  if (!isConfigured()) return <NotConfigured />;
  const { slug } = await params;
  const { supabase, detail } = await load(slug);
  if (!detail) notFound();

  const sections = sectionsOf(detail);
  const { data: commentData } = sections.length
    ? await supabase.rpc('public_comments', { p_company: detail.id })
    : { data: [] };
  const comments = (commentData as Comment[]) ?? [];
  const latest = sections.map((s) => s.last_report).sort().at(-1);
  const top = sections[0];
  const multi = sections.length > 1;

  return (
    <>
      <p className="small"><Link href="/">← All rates</Link></p>
      <h1>{detail.name}</h1>
      <p>
        <span className="tag">{kindLabel(detail.kind)}</span>
        <span className="tag">{detail.reports} {detail.reports === 1 ? 'report' : 'reports'}</span>
        {latest && <span className="tag">Latest {monthYear(latest)}</span>}
      </p>

      {!sections.length ? (
        <div className="notice">
          <strong>Not enough reports yet.</strong>
          <p className="small muted" style={{ margin: '4px 0 0' }}>
            We show figures once at least 3 people have reported the same kind of work here, so nobody can be
            identified. <Link href="/submit">Add yours</Link>.
          </p>
        </div>
      ) : (
        <>
          {sections.map((s) => (
            <section key={s.work_type}>
              <h2>{workLabel(s.work_type)} <span className="small muted">· {s.reports} reports</span></h2>
              <SectionStats s={s} />

              {s.work_type === 'hgv' && detail.breakdown.length > 0 && (
                <>
                  <h3>By licence and job type</h3>
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
            </section>
          ))}
          <p className="small muted">
            Each kind of work is shown separately, and only once it has 3 or more reports.
          </p>

          <h2>What workers say</h2>
          {comments.length === 0 ? (
            <p className="muted">No comments yet.</p>
          ) : (
            <div className="stack">
              {comments.map((c) => (
                <div key={c.id} className="card">
                  <p style={{ marginBottom: 6 }}>{c.body}</p>
                  <div className="small muted">
                    {(c.work_type ?? 'hgv') === 'hgv'
                      ? <>{multi && 'HGV · '}{label(LICENCES, c.licence ?? '')} · {label(JOB_TYPES, c.job_type ?? '')}</>
                      : workLabel(c.work_type)}
                    {' · '}{monthYear(c.worked_month)}
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
        label={top ? 'Know someone working for them?' : `Help get ${detail.name} on the board`}
        text={top
          ? `${detail.name} – real pay reported by workers (median ${money(top.median)}/hr). What are you on?`
          : `Anyone working for ${detail.name}? Add what they pay (anonymous) so we can all see a fair rate:`}
      />

      <ShareBand />
      <p className="small muted" style={{ marginTop: 20 }}>
        Rates are reported anonymously by workers and haven&apos;t been verified by {detail.name}. Think something here is
        wrong? <Link href={`/contact?company=${encodeURIComponent(detail.name)}`}>Request a review</Link>.
      </p>
    </>
  );
}
