'use client';

import { useActionState } from 'react';
import { sendRemovalRequest, type FormState } from '../actions';

export default function ContactForm({ company }: { company: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(sendRemovalRequest, {});
  if (state.ok) return <div className="notice success" role="status">{state.message}</div>;
  return (
    <form action={action} className="card">
      <input className="hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <div className="grid2">
        <div className="field"><label htmlFor="name">Your name</label><input id="name" name="name" required maxLength={100} /></div>
        <div className="field"><label htmlFor="email">Your email</label><input id="email" name="email" type="email" required maxLength={200} /></div>
        <div className="field"><label htmlFor="company">Company (if relevant)</label><input id="company" name="company" defaultValue={company} maxLength={100} /></div>
        <div className="field"><label htmlFor="page_url">Page link (if relevant)</label><input id="page_url" name="page_url" maxLength={300} /></div>
      </div>
      <div className="field"><label htmlFor="message">What&apos;s the problem?</label><textarea id="message" name="message" required minLength={10} maxLength={2000} /></div>
      {state.error && <p className="notice error" role="alert">{state.error}</p>}
      <button className="btn" disabled={pending}>{pending ? 'Sending…' : 'Send request'}</button>
    </form>
  );
}
