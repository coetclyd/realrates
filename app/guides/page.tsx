import type { Metadata } from 'next';
import Link from 'next/link';
import { GUIDES } from '@/lib/guides';

export const metadata: Metadata = {
  title: 'Guides for shift workers',
  description: 'Plain-English guides for UK shift and agency workers: PAYE vs umbrella, what to ask an agency before signing, and more.',
  alternates: { canonical: '/guides' },
};

export default function GuidesIndex() {
  return (
    <div className="prose">
      <h1>Guides for shift workers</h1>
      <div className="stack">
        {GUIDES.map((g) => (
          <Link key={g.slug} href={`/guides/${g.slug}`} className="card result" style={{ gridTemplateColumns: '1fr' }}>
            <div className="name">{g.title}</div>
            <div className="small muted">{g.description}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
