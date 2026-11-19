import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { isConfigured } from '@/lib/supabase/env';
import { enabledSocialProviders } from '@/lib/auth-providers';
import SubmitForm from './submit-form';
import { NotConfigured } from '../components';
import { SITE_URL } from '@/lib/options';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Share your rate',
  description: 'Learn about ShiftRates and anonymously share your shift pay rate in about 60 seconds.',
};

export default async function SubmitPage() {
  if (!isConfigured()) return <NotConfigured />;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: companies } = await supabase.rpc('list_companies');
  return (
    <div style={{ maxWidth: 640 }}>
      <h1>Share your rate</h1>
      <p className="muted">
        What does your job actually pay? Takes about 60 seconds. One job, one rate: add a separate entry for each agency or contract.
      </p>
      <SubmitForm
        companies={(companies as { name: string }[]) ?? []}
        siteUrl={SITE_URL}
        signedIn={Boolean(user)}
        providers={enabledSocialProviders()}
      />
      {user && (
        <form action="/auth/signout" method="post" style={{ marginTop: 16 }}>
          <button className="linkbtn">Sign out</button>
        </form>
      )}
    </div>
  );
}
