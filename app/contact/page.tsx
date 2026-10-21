import type { Metadata } from 'next';
import { pick, CONTACT_EMAIL } from '@/lib/options';
import ContactForm from './contact-form';

export const metadata: Metadata = { title: 'Complaints and removal requests' };

export default async function ContactPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return (
    <div className="prose">
      <h1>Complaints and removal requests</h1>
      <p>
        If you think something on this site is inaccurate, unfair or identifies someone, tell us here. Companies and
        individuals can both use this form. We review every request, normally within 5 working days, and remove
        content that breaks our <a href="/terms">rules</a>.
      </p>
      <ContactForm company={pick(sp.company) ?? ''} />
      {CONTACT_EMAIL && <p className="small muted" style={{ marginTop: 14 }}>You can also email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>}
    </div>
  );
}
