'use client';

import { useActionState } from 'react';
import { sendMagicLink, verifyCode, type FormState } from './actions';

function CodeForm({ email, next, notice }: { email: string; next: string; notice?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(verifyCode, {});
  return (
    <form action={action} className="card">
      {notice && <p className="notice success" role="status">{notice}</p>}
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label htmlFor="code">
          Enter the code
          <span className="hint">Type the code from the email, or tap the link in it. The code works in any browser or app.</span>
        </label>
        <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,9}" maxLength={9} required autoFocus
          style={{ fontSize: '1.5rem', letterSpacing: '0.3em', textAlign: 'center' }} />
      </div>
      {state.error && <p className="notice error" role="alert">{state.error}</p>}
      <button className="btn block" disabled={pending}>{pending ? 'Checking…' : 'Sign in'}</button>
      <p className="small muted" style={{ marginTop: 10, marginBottom: 0 }}>
        No email? Check spam, or <a href={`?next=${encodeURIComponent(next)}`}>start again</a>.
      </p>
    </form>
  );
}

export default function LoginForm({ next = '/submit' }: { next?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(sendMagicLink, {});
  if (state.ok && state.email) return <CodeForm email={state.email} next={state.next ?? next} notice={state.message} />;
  if (state.ok) return <div className="notice success" role="status">{state.message}</div>;
  return (
    <form action={action} className="card">
      <input type="hidden" name="next" value={next} />
      <input className="hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <div className="field">
        <label htmlFor="email">
          Your email
          <span className="hint">We email you a sign-in code. Your email is never shown or linked to your rates.</span>
        </label>
        <input id="email" name="email" type="email" inputMode="email" autoComplete="email" required />
      </div>
      {state.error && <p className="notice error" role="alert">{state.error}</p>}
      <button className="btn block" disabled={pending}>{pending ? 'Sending…' : 'Email me a sign-in code'}</button>
    </form>
  );
}
