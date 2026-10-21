import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isConfigured } from '@/lib/supabase/env';
import { REGIONS, pick } from '@/lib/options';
import { Filters, Results, ShareBand, NotConfigured, type SearchRow } from '../../components';

export const dynamic = 'force-dynamic';
type Params = Promise<{ slug: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

const find = (slug: string) => REGIONS.find((r) => r.slug === slug);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const r = find((await params).slug);
  if (!r) return { title: 'Region not found' };
  return {
    title: `HGV driver pay in ${r.seo} – real driver reports`,
    description: `What HGV agencies and hauliers in ${r.seo} actually pay, reported anonymously by lorry drivers. Compare hourly rates by licence and job type.`,
    alternates: { canonical: `/region/${r.slug}` },
  };
}

export default async function RegionPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { slug } = await params;
  const region = find(slug);
  if (!region) notFound();
  if (!isConfigured()) return <NotConfigured />;
  const sp = await searchParams;
  const values = { licence: pick(sp.licence), job: pick(sp.job), shift: pick(sp.shift) };

  const supabase = await createClient();
  const { data } = await supabase.rpc('search_rates', {
    p_region: region.slug, p_licence: values.licence ?? null, p_job_type: values.job ?? null,
    p_shift: values.shift ?? null, p_postcode: null,
  });
  const rows = (data as SearchRow[]) ?? [];

  return (
    <>
      <p className="small"><Link href="/">← All UK</Link></p>
      <h1>HGV driver pay in {region.seo}</h1>
      <p className="muted">Real hourly rates reported anonymously by drivers working in {region.seo}.</p>
      <Filters values={values} action={`/region/${region.slug}`} />
      <h2>{rows.length} {rows.length === 1 ? 'company' : 'companies'}</h2>
      <Results rows={rows} />
      <ShareBand />
    </>
  );
}
