import type { Metadata } from 'next';
import Link from 'next/link';
import { GUIDES } from '@/lib/guides';

export const metadata: Metadata = {
  title: 'Guides for HGV drivers',
  description: 'Plain-English guides on HGV agency pay, umbrella companies, night-out allowances and what to ask before signing.',
  alternates: { canonical: '/guides' },
};

export default function GuidesIndex() {
  return (
    <div className="prose">
      <h1>Guides for drivers</h1>
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
