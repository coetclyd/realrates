'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createClient as createPlainClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseKey } from '@/lib/supabase/env';
import { SITE_URL, REGIONS, LICENCES, JOB_TYPES, SHIFTS, PAY_ROUTES } from '@/lib/options';

export type FormState = { ok?: boolean; error?: string; message?: string; email?: string; next?: string };

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === 'string' ? v.trim() : '';
};
const num = (fd: FormData, k: string) => {
  const v = str(fd, k);
  if (!v) return null;
  const n = Number(v.replace(/[£,\s]/g, ''));
  return Number.isFinite(n) ? n : NaN;
};
const oneOf = (v: string, list: readonly { value?: string; slug?: string }[]) =>
  list.some((x) => (x.value ?? x.slug) === v);

async function origin() {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'https';
  return host ? `${proto}://${host}` : SITE_URL;
}

// ---------- Auth ----------
export async function sendMagicLink(_: FormState, fd: FormData): Promise<FormState> {
  if (str(fd, 'website')) return { ok: true, message: 'Check your email.' }; // honeypot
  const email = str(fd, 'email').toLowerCase();
  const next = str(fd, 'next') || '/submit';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Enter a valid email address.' };
  // Plain client with the implicit flow: the sign-in tokens come back inside the email link,
  // so it works whichever browser or email app opens it (no code stored in the requesting browser).
  const supabase = createPlainClient(supabaseUrl(), supabaseKey(), {
    auth: { flowType: 'implicit', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/submit';
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${await origin()}/auth/finish?next=${encodeURIComponent(safeNext)}` },
  });
  if (error) {
    return { error: error.status === 429 ? 'Too many emails sent. Wait a few minutes and try again.' : 'Could not send the email. Try again shortly.' };
  }
  return { ok: true, email, next: safeNext, message: `We've emailed ${email} a sign-in link. Use only the newest email.` };
}

export async function verifyCode(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, 'email').toLowerCase();
  const token = str(fd, 'code').replace(/\s/g, '');
  const next = str(fd, 'next');
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/submit';
  if (!/^\d{6,8}$/.test(token)) return { ok: true, email, next: safeNext, error: 'Enter the code from the email (numbers only).' };
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) return { ok: true, email, next: safeNext, error: 'That code is wrong or has expired. Check the latest email, or request a new one.' };
  redirect(safeNext);
}

// ---------- Submit a rate ----------
export async function submitRate(_: FormState, fd: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Your login has expired. Refresh the page and sign in again.' };

  const companyName = str(fd, 'company_name').replace(/\s+/g, ' ');
  const newKind = str(fd, 'kind');
  const region = str(fd, 'region');
  const postcode = str(fd, 'postcode_area').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
  const licence = str(fd, 'licence');
  const job = str(fd, 'job_type');
  const shift = str(fd, 'shift');
  const route = str(fd, 'pay_route');
  const canc = str(fd, 'cancellations');
  const paid = str(fd, 'paid_correctly');
  const month = str(fd, 'worked_month');
  const rate = num(fd, 'hourly_rate');
  const ot = num(fd, 'overtime_rate');
  const nightOut = num(fd, 'night_out');
  const comment = str(fd, 'comment');

  if (companyName.length < 2 || companyName.length > 80) return { error: 'Enter the agency or haulier name.' };
  if (!['agency', 'haulier'].includes(newKind)) return { error: 'Say whether it is an agency or a haulier.' };
  if (!oneOf(region, REGIONS)) return { error: 'Choose a region.' };
  if (!oneOf(licence, LICENCES)) return { error: 'Choose your licence.' };
  if (!oneOf(job, JOB_TYPES)) return { error: 'Choose a job type.' };
  if (!oneOf(shift, SHIFTS)) return { error: 'Choose a shift.' };
  if (!oneOf(route, PAY_ROUTES)) return { error: 'Choose how you were paid.' };
  if (!['never', 'sometimes', 'often'].includes(canc)) return { error: 'Answer the cancelled shifts question.' };
  if (!['yes', 'mostly', 'no'].includes(paid)) return { error: 'Answer the paid correctly question.' };
  if (rate === null || Number.isNaN(rate) || rate < 10 || rate > 60)
    return { error: 'Hourly rate must be between £10 and £60. Enter the hourly figure, not a day rate.' };
  if (ot !== null && (Number.isNaN(ot) || ot < 10 || ot > 90)) return { error: 'Overtime rate must be between £10 and £90, or left blank.' };
  if (nightOut !== null && (Number.isNaN(nightOut) || nightOut < 0 || nightOut > 100)) return { error: 'Night-out allowance must be between £0 and £100, or left blank.' };
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: 'Choose the month you worked.' };
  if (comment.length > 300) return { error: 'Keep the comment under 300 characters.' };

  // Match an existing company by name (case-insensitive), otherwise add it for admin approval.
  const { data: list } = await supabase.rpc('list_companies');
  const match = (list as { id: string; name: string }[] | null)?.find(
    (c) => c.name.toLowerCase() === companyName.toLowerCase());
  let cid = match?.id;
  if (!cid) {
    const { data: mine } = await supabase.from('companies').select('id, name').eq('created_by', user.id);
    cid = mine?.find((c) => c.name.toLowerCase() === companyName.toLowerCase())?.id;
  }
  if (!cid) {
    const { data, error } = await supabase.from('companies').insert({ name: companyName, kind: newKind }).select('id').single();
    if (error || !data) {
      return { error: error?.message.includes('RATE_LIMIT_COMPANY') ? 'You can add up to 3 new companies a day.' : 'Could not add that company. Check the name and try again.' };
    }
    cid = data.id;
  }

  const { data: report, error } = await supabase.from('rate_reports').insert({
    company_id: cid, region, postcode_area: postcode || null,
    site_town: str(fd, 'site_town').slice(0, 60) || null,
    client_name: str(fd, 'client_name').slice(0, 80) || null,
    licence, job_type: job, shift, hourly_rate: rate, overtime_rate: ot, night_out: nightOut,
    pay_route: route, cancellations: canc, paid_correctly: paid, worked_month: `${month}-01`,
  }).select('id').single();

  if (error || !report) {
    const m = error?.message ?? '';
    if (m.includes('RATE_LIMIT')) return { error: 'You can share up to 5 rates a day. Thanks for helping – come back tomorrow.' };
    if (m.includes('FUTURE_MONTH')) return { error: 'The month worked can’t be in the future.' };
    return { error: 'Could not save your rate. Check the details and try again.' };
  }

  if (comment.length >= 3) {
    await supabase.from('comments').insert({ report_id: report.id, company_id: cid, body: comment });
  }

  revalidatePath('/');
  return {
    ok: true,
    message: comment
      ? 'Thanks! Your rate is saved. Your comment will appear once it has been checked.'
      : 'Thanks! Your rate is saved. It counts towards the figures straight away.',
  };
}

// ---------- Public reports and contact ----------
export async function reportComment(commentId: string, reason: string) {
  if (!/^[0-9a-f-]{36}$/i.test(commentId)) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from('abuse_reports').insert({ comment_id: commentId, reason: reason.slice(0, 300) || null });
  return { ok: !error };
}

export async function sendRemovalRequest(_: FormState, fd: FormData): Promise<FormState> {
  if (str(fd, 'website')) return { ok: true, message: 'Thanks, we’ve received your request.' };
  const name = str(fd, 'name');
  const email = str(fd, 'email');
  const message = str(fd, 'message');
  if (name.length < 2) return { error: 'Enter your name.' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Enter a valid email address.' };
  if (message.length < 10) return { error: 'Tell us a bit more about the problem (at least 10 characters).' };
  const supabase = await createClient();
  const { error } = await supabase.from('removal_requests').insert({
    name: name.slice(0, 100), email: email.slice(0, 200),
    company: str(fd, 'company').slice(0, 100) || null,
    page_url: str(fd, 'page_url').slice(0, 300) || null,
    message: message.slice(0, 2000),
  });
  if (error) return { error: 'Could not send your request. Try again shortly.' };
  return { ok: true, message: 'Thanks, we’ve received your request and will review it, normally within 5 working days.' };
}

// ---------- Admin ----------
async function requireAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.rpc('is_admin');
  if (!data) redirect('/');
  return supabase;
}

export async function setCommentStatus(fd: FormData) {
  const supabase = await requireAdmin();
  const status = str(fd, 'status');
  if (!['approved', 'rejected'].includes(status)) return;
  await supabase.from('comments').update({ status }).eq('id', str(fd, 'id'));
  revalidatePath('/admin');
}

export async function approveCompany(fd: FormData) {
  const supabase = await requireAdmin();
  await supabase.from('companies').update({ approved: true }).eq('id', str(fd, 'id'));
  revalidatePath('/admin');
  revalidatePath('/');
}

export async function deleteCompany(fd: FormData) {
  const supabase = await requireAdmin();
  await supabase.from('companies').delete().eq('id', str(fd, 'id'));
  revalidatePath('/admin');
}

export async function mergeCompanies(fd: FormData) {
  const supabase = await requireAdmin();
  const from = str(fd, 'from');
  const into = str(fd, 'into');
  if (from && into && from !== into) await supabase.rpc('merge_companies', { p_from: from, p_into: into });
  revalidatePath('/admin');
}

export async function resolveAbuse(fd: FormData) {
  const supabase = await requireAdmin();
  const id = str(fd, 'id');
  if (str(fd, 'remove') === '1') {
    await supabase.from('comments').update({ status: 'rejected' }).eq('id', str(fd, 'comment_id'));
  }
  await supabase.from('abuse_reports').update({ resolved: true }).eq('id', id);
  revalidatePath('/admin');
}

export async function resolveRemoval(fd: FormData) {
  const supabase = await requireAdmin();
  await supabase.from('removal_requests').update({ resolved: true }).eq('id', str(fd, 'id'));
  revalidatePath('/admin');
}
