import type { Metadata } from 'next';
import LoginForm from '../login-form';
import { pick } from '@/lib/options';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = pick(sp.next) ?? '/submit';
  return (
    <div style={{ maxWidth: 480 }}>
      <h1>Sign in</h1>
      {pick(sp.error) === 'link' && (
        <p className="notice error">That login link has expired or was already used. Request a new one below.</p>
      )}
      <LoginForm next={next.startsWith('/') ? next : '/submit'} />
    </div>
  );
}
