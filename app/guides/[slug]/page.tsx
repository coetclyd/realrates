import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GUIDES } from '@/lib/guides';
import { ShareBand } from '../../components';

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const g = GUIDES.find((x) => x.slug === slug);
  if (!g) return { title: 'Guide not found' };
  return { title: g.title, description: g.description, alternates: { canonical: `/guides/${g.slug}` } };
}

export default async function GuidePage({ params }: { params: Params }) {
  const { slug } = await params;
  const g = GUIDES.find((x) => x.slug === slug);
  if (!g) notFound();
  return (
    <>
      <p className="small"><Link href="/guides">← All guides</Link></p>
      <article className="prose guide">
        <h1>{g.title}</h1>
        {g.body}
      </article>
      <ShareBand />
    </>
  );
}
