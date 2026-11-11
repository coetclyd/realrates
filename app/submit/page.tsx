import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { isConfigured } from '@/lib/supabase/env';
import LoginForm from '../login-form';
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

  if (!user) {
    return (
      <div style={{ maxWidth: 560 }}>
        <h1>Share your rate</h1>
        <p className="muted">What does your job actually pay? ShiftRates helps UK shift workers compare real pay.</p>
        <ul>
          <li><strong>Share:</strong> report your rate anonymously in about 60 seconds.</li>
          <li><strong>Compare:</strong> see pay rates as more workers contribute.</li>
          <li><strong>Calculate:</strong> use our <a href="/calculator">free take-home pay calculator</a>.</li>
        </ul>
        <p className="small muted">Sign in to prevent spam. Your email is never displayed with your report.</p>
        <LoginForm next="/submit" providers={enabledSocialProviders()} />
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
