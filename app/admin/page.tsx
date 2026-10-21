import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { isConfigured } from '@/lib/supabase/env';
import LoginForm from '../login-form';
import { NotConfigured } from '../components';
import {
  setCommentStatus, approveCompany, deleteCompany, mergeCompanies, resolveAbuse, resolveRemoval,
} from '../actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };

const when = (d: string) => new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

export default async function AdminPage() {
  if (!isConfigured()) return <NotConfigured />;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (<div style={{ maxWidth: 480 }}><h1>Admin</h1><LoginForm next="/admin" /></div>);
  }
  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) {
    return (
      <div className="prose">
        <h1>Not an admin</h1>
        <p>You&apos;re signed in as {user.email}, but this account isn&apos;t an admin yet.</p>
        <p className="muted small">To make it one, run this in Supabase SQL Editor:</p>
        <pre className="card" style={{ whiteSpace: 'pre-wrap' }}>{`insert into public.admins (user_id)\nselect id from auth.users where email = '${user.email}';`}</pre>
      </div>
    );
  }

  const [comments, pendingCos, allCos, abuse, removals] = await Promise.all([
    supabase.from('comments').select('id, body, flags, created_at, companies(name)').eq('status', 'pending').order('created_at').limit(100),
    supabase.from('companies').select('id, name, kind, created_at').eq('approved', false).order('created_at').limit(100),
    supabase.from('companies').select('id, name').eq('approved', true).order('name'),
    supabase.from('abuse_reports').select('id, reason, created_at, comment_id, comments(body, status, companies(name))').eq('resolved', false).order('created_at').limit(100),
    supabase.from('removal_requests').select('*').eq('resolved', false).order('created_at').limit(100),
  ]);

  type Co = { name: string } | { name: string }[] | null;
  const coName = (c: Co) => (Array.isArray(c) ? c[0]?.name : c?.name) ?? '?';

  return (
    <>
      <h1>Admin</h1>
      <p className="muted small">Signed in as {user.email}</p>

      <h2>Comments to check ({comments.data?.length ?? 0})</h2>
      <div className="stack">
        {(comments.data ?? []).map((c) => (
          <div key={c.id} className="card admin-item">
            <div className="small muted">{coName(c.companies as Co)} · {when(c.created_at)}</div>
            <div>{c.body}</div>
            {c.flags?.length > 0 && <div className="flag">⚑ {c.flags.join(', ')}</div>}
            <div className="actions">
              <form action={setCommentStatus}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="status" value="approved" /><button className="btn small">Approve</button></form>
              <form action={setCommentStatus}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="status" value="rejected" /><button className="btn small danger">Reject</button></form>
            </div>
          </div>
        ))}
        {!comments.data?.length && <p className="muted">Nothing waiting.</p>}
      </div>

      <h2>New company names ({pendingCos.data?.length ?? 0})</h2>
      <div className="stack">
        {(pendingCos.data ?? []).map((c) => (
          <div key={c.id} className="card admin-item">
            <div><strong>{c.name}</strong> <span className="tag">{c.kind}</span> <span className="small muted">{when(c.created_at)}</span></div>
            <div className="actions">
              <form action={approveCompany}><input type="hidden" name="id" value={c.id} /><button className="btn small">Approve</button></form>
              {(allCos.data?.length ?? 0) > 0 && (
                <form action={mergeCompanies} style={{ display: 'flex', gap: 8 }}>
                  <input type="hidden" name="from" value={c.id} />
                  <select name="into" required defaultValue="" style={{ minHeight: 36, padding: '4px 8px' }}>
                    <option value="" disabled>Duplicate of…</option>
                    {allCos.data!.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <button className="btn small secondary">Merge</button>
                </form>
              )}
              <form action={deleteCompany}><input type="hidden" name="id" value={c.id} /><button className="btn small danger">Delete (and its reports)</button></form>
            </div>
          </div>
        ))}
        {!pendingCos.data?.length && <p className="muted">Nothing waiting.</p>}
      </div>

      <h2>Reported comments ({abuse.data?.length ?? 0})</h2>
      <div className="stack">
        {(abuse.data ?? []).map((a) => {
          const cm = (Array.isArray(a.comments) ? a.comments[0] : a.comments) as { body: string; status: string; companies: Co } | null;
          return (
            <div key={a.id} className="card admin-item">
              <div className="small muted">{cm ? coName(cm.companies) : '?'} · {when(a.created_at)} · comment is {cm?.status}</div>
              <div>{cm?.body}</div>
              {a.reason && <div className="flag">Reason: {a.reason}</div>}
              <div className="actions">
                <form action={resolveAbuse}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="comment_id" value={a.comment_id} /><input type="hidden" name="remove" value="1" /><button className="btn small danger">Remove comment</button></form>
                <form action={resolveAbuse}><input type="hidden" name="id" value={a.id} /><button className="btn small secondary">Keep it</button></form>
              </div>
            </div>
          );
        })}
        {!abuse.data?.length && <p className="muted">Nothing reported.</p>}
      </div>

      <h2>Complaints and removal requests ({removals.data?.length ?? 0})</h2>
      <div className="stack">
        {(removals.data ?? []).map((r) => (
          <div key={r.id} className="card admin-item">
            <div className="small muted">{when(r.created_at)}</div>
            <div><strong>{r.name}</strong> · <a href={`mailto:${r.email}`}>{r.email}</a>{r.company && ` · ${r.company}`}</div>
            {r.page_url && <div className="small">{r.page_url}</div>}
            <div style={{ whiteSpace: 'pre-wrap' }}>{r.message}</div>
            <div className="actions">
              <form action={resolveRemoval}><input type="hidden" name="id" value={r.id} /><button className="btn small secondary">Mark handled</button></form>
            </div>
          </div>
        ))}
        {!removals.data?.length && <p className="muted">Nothing waiting.</p>}
      </div>

      <form action="/auth/signout" method="post" style={{ marginTop: 24 }}><button className="linkbtn">Sign out</button></form>
    </>
  );
}
