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
  description: 'Learn about ShiftRates and anonymously share your HGV pay rate in about 60 seconds.',
};

export default async function SubmitPage() {
  if (!isConfigured()) return <NotConfigured />;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div style={{ maxWidth: 560 }}>
        <h1>What does your job actually pay?</h1>
        <p>ShiftRates is a free UK platform helping workers share and compare real pay rates.</p>
        <p>See what people are actually earning, not just what jobs advertise.</p>
        <ul>
          <li><strong>Share your rate:</strong> anonymously report what you&apos;re paid.</li>
          <li><strong>Compare pay:</strong> explore rates as more workers contribute.</li>
          <li><strong>Calculate take-home pay:</strong> estimate what you&apos;ll take home after deductions using our <a href="/calculator">free calculator</a>.</li>
        </ul>
        <p className="muted">We&apos;re starting with HGV driving jobs and plan to expand to other types of work. HGV drivers can share a rate in about 60 seconds.</p>
        <p className="muted">Sign in with Google or confirm your email to help us prevent spam. Your email is never displayed alongside your pay report.</p>
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
