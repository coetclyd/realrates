'use client';

import { useActionState } from 'react';
import { sendMagicLink, type FormState } from './actions';

export default function LoginForm({ next = '/submit' }: { next?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(sendMagicLink, {});
  if (state.ok) return <div className="card" role="status"><h2>Check your email</h2><p>{state.message}</p><p>Tap the sign-in link in the newest email. Check spam if it hasn’t arrived.</p><a href={`/login?next=${encodeURIComponent(next)}`}>Try another email</a></div>;
  return (
    <div className="card">
      <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
        <a className="btn block" href={`/auth/provider/google?next=${encodeURIComponent(next)}`}>Continue with Google</a>
        <a className="btn block" href={`/auth/provider/azure?next=${encodeURIComponent(next)}`}>Continue with Microsoft</a>
        <a className="btn block" href={`/auth/provider/facebook?next=${encodeURIComponent(next)}`}>Continue with Facebook</a>
      </div>
      <p className="small muted" style={{ textAlign: 'center' }}>Or sign in with email</p>
    <form action={action}>
      <input type="hidden" name="next" value={next} />
      <input className="hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <div className="field">
        <label htmlFor="email">
          Your email
          <span className="hint">We email you a sign-in link. Your email is never shown or linked to your rates.</span>
        </label>
        <input id="email" name="email" type="email" inputMode="email" autoComplete="email" required />
      </div>
      {state.error && <p className="notice error" role="alert">{state.error}</p>}
      <button className="btn block" disabled={pending}>{pending ? 'Sending…' : 'Email me a sign-in link'}</button>
    </form>
    </div>
  );
}
