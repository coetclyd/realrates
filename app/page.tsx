import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isConfigured } from '@/lib/supabase/env';
import { REGIONS, pick } from '@/lib/options';
import { Filters, Results, ShareBand, NotConfigured, type SearchRow } from './components';

export const dynamic = 'force-dynamic';

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Home({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const values = { region: pick(sp.region), licence: pick(sp.licence), job: pick(sp.job), shift: pick(sp.shift) };

  let rows: SearchRow[] = [];
  let failed = false;
  if (isConfigured()) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('search_rates', {
      p_region: values.region ?? null,
      p_licence: values.licence ?? null,
      p_job_type: values.job ?? null,
      p_shift: values.shift ?? null,
      p_postcode: null,
    });
    if (error) failed = true;
    rows = (data as SearchRow[]) ?? [];
  }

  return (
    <>
      <section className="hero">
        <h1>What does that job actually pay?</h1>
        <p>
          Real hourly rates reported anonymously by HGV drivers. Compare agencies and hauliers for the same
          work in your area before you take the shift.
        </p>
        <p style={{ marginTop: -4 }}>
          <Link href="/submit" className="btn">Share your rate (anonymous, 60 seconds)</Link>
        </p>
      </section>

      <Filters values={values} />

      <h2>{rows.length ? `${rows.length} ${rows.length === 1 ? 'company' : 'companies'}` : 'Results'}</h2>
      {!isConfigured() ? <NotConfigured /> : failed ? (
        <div className="notice error">Couldn&apos;t load rates just now. Please try again in a minute.</div>
      ) : <Results rows={rows} />}

      <h2>Browse by region</h2>
      <div className="choice-row">
        {REGIONS.map((r) => (
          <Link key={r.slug} href={`/region/${r.slug}`} className="btn secondary small">{r.name}</Link>
        ))}
      </div>

      <ShareBand />
    </>
  );
}
