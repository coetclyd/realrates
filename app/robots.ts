import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/options';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/auth/', '/login'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
