'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Email link lands here. Handles every format Supabase may send back:
// tokens after '#' (works in any browser), ?code= (same browser), or ?token_hash=.
export default function FinishSignIn() {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const run = async () => {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
      const nextParam = url.searchParams.get('next') ?? '/submit';
      const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/submit';
      const supabase = createClient();

      let ok = false;
      const access = hash.get('access_token');
      const refresh = hash.get('refresh_token');
      const code = url.searchParams.get('code');
      const tokenHash = url.searchParams.get('token_hash');

      if (access && refresh) {
        ok = !(await supabase.auth.setSession({ access_token: access, refresh_token: refresh })).error;
      } else if (code) {
        ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
      } else if (tokenHash) {
        ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' })).error;
      }

      if (ok) {
        window.location.replace(next);
      } else {
        setFailed(true);
        window.location.replace(`/login?error=link&next=${encodeURIComponent(next)}`);
      }
    };
    run();
  }, []);

  return (
    <div className="prose">
      <h1>{failed ? 'Sign-in link didn’t work' : 'Signing you in…'}</h1>
      <p className="muted">{failed ? 'Taking you back to request a new one.' : 'One moment.'}</p>
    </div>
  );
}
