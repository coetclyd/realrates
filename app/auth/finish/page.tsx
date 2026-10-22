'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Email link lands here. Handles every format Supabase may send back:
// tokens after '#' (works in any browser), ?code= (same browser), or ?token_hash=.
export default function FinishSignIn() {
  const [failed, setFailed] = useState<string | null>(null);
  const [next, setNext] = useState('/submit');

  useEffect(() => {
    const run = async () => {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
      const nextParam = url.searchParams.get('next') ?? '/submit';
      const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/submit';
      const supabase = createClient();

      setNext(next);
      let err: string | null = null;
      const access = hash.get('access_token');
      const refresh = hash.get('refresh_token');
      const code = url.searchParams.get('code');
      const tokenHash = url.searchParams.get('token_hash');

      if (access && refresh) {
        err = (await supabase.auth.setSession({ access_token: access, refresh_token: refresh })).error?.message ?? null;
      } else if (code) {
        err = (await supabase.auth.exchangeCodeForSession(code)).error?.message ?? null;
      } else if (tokenHash) {
        err = (await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' })).error?.message ?? null;
      } else {
        err = hash.get('error_description') || url.searchParams.get('error_description') || 'No sign-in details found in the link.';
      }
      console.log('[auth/finish]', { hadHash: Boolean(access), hadCode: Boolean(code), hadTokenHash: Boolean(tokenHash), err });
      const ok = !err;

      if (ok) {
        window.location.replace(next);
      } else {
        setFailed(err);
      }
    };
    run();
  }, []);

  return (
    <div className="prose">
      <h1>{failed ? 'Sign-in link didn’t work' : 'Signing you in…'}</h1>
      {failed ? (
        <>
          <p className="notice error">Reason: {failed}</p>
          <p><a className="btn" href={`/login?next=${encodeURIComponent(next)}`}>Request a new link</a></p>
        </>
      ) : <p className="muted">One moment.</p>}
    </div>
  );
}
