import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { isConfigured } from '@/lib/supabase/env';
import LoginForm from '../login-form';
import SubmitForm from './submit-form';
import { NotConfigured } from '../components';
import { SITE_URL } from '@/lib/options';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Share your rate',
  description: 'Anonymously share what an HGV agency or haulier pays, in 60 seconds.',
};

export default async function SubmitPage() {
  if (!isConfigured()) return <NotConfigured />;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div style={{ maxWidth: 560 }}>
        <h1>Share your rate</h1>
        <p className="muted">
          Anonymous and takes about 60 seconds. First, confirm your email so we can stop spam. Nobody else ever sees it.
        </p>
        <LoginForm next="/submit" />
      </div>
    );
  }

  const { data: companies } = await supabase.rpc('list_companies');
  return (
    <div style={{ maxWidth: 640 }}>
      <h1>Share your rate</h1>
      <p className="muted">One job, one rate. Add a separate entry for each agency or contract.</p>
      <SubmitForm companies={(companies as { name: string }[]) ?? []} siteUrl={SITE_URL} />
      <form action="/auth/signout" method="post" style={{ marginTop: 16 }}>
        <button className="linkbtn">Sign out</button>
      </form>
    </div>
  );
}
