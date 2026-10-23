import type { MetadataRoute } from 'next';
import { createClient as createBareClient } from '@supabase/supabase-js';
import { REGIONS, SITE_URL } from '@/lib/options';
import { GUIDES } from '@/lib/guides';
import { isConfigured, supabaseUrl, supabaseKey } from '@/lib/supabase/env';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/calculator`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/submit`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/guides`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    ...GUIDES.map((g) => ({ url: `${SITE_URL}/guides/${g.slug}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 })),
    ...REGIONS.map((r) => ({ url: `${SITE_URL}/region/${r.slug}`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.8 })),
  ];
  if (!isConfigured()) return pages;
  try {
    const supabase = createBareClient(supabaseUrl(), supabaseKey(), { auth: { persistSession: false } });
    const { data } = await supabase.rpc('list_companies');
    for (const c of (data as { slug: string }[]) ?? []) {
      pages.push({ url: `${SITE_URL}/company/${c.slug}`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 });
    }
  } catch {
    // Sitemap still works without company pages.
  }
  return pages;
}
