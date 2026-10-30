import type { Metadata } from 'next';
import LoginForm from '../login-form';
import { pick } from '@/lib/options';
import { enabledSocialProviders } from '@/lib/auth-providers';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = pick(sp.next) ?? '/submit';
  return (
    <div style={{ maxWidth: 480 }}>
      <h1>Sign in</h1>
      {pick(sp.error) === 'link' && (
        <p className="notice error">That link had expired or was already used (some email apps open links automatically). Request a new one below and tap it in this same browser.</p>
      )}
      {pick(sp.error) === 'provider' && <p className="notice error" role="alert">Sign-in with that account didn't work. Try again or use email.</p>}
      <LoginForm providers={enabledSocialProviders()} next={next.startsWith('/') && !next.startsWith('//') ? next : '/submit'} />
    </div>
  );
}
