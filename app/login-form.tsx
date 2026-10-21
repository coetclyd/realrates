'use client';

import { useActionState } from 'react';
import { sendMagicLink, type FormState } from './actions';

export default function LoginForm({ next = '/submit' }: { next?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(sendMagicLink, {});
  if (state.ok) return <div className="notice success" role="status">{state.message}</div>;
  return (
    <form action={action} className="card">
      <input type="hidden" name="next" value={next} />
      <input className="hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <div className="field">
        <label htmlFor="email">
          Your email
          <span className="hint">We email you a one-tap login link. Your email is never shown or linked to your rates.</span>
        </label>
        <input id="email" name="email" type="email" inputMode="email" autoComplete="email" required />
      </div>
      {state.error && <p className="notice error" role="alert">{state.error}</p>}
      <button className="btn block" disabled={pending}>{pending ? 'Sending…' : 'Email me a login link'}</button>
    </form>
  );
}
