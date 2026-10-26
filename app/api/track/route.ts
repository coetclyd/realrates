import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isConfigured, supabaseUrl, supabaseKey } from '@/lib/supabase/env';

// Anonymous visit counter: increments a per-day count. Stores no IP, cookie or identifier.
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|curl|wget|python|headless|lighthouse/i;

export async function POST(request: NextRequest) {
  if (!isConfigured()) return new NextResponse(null, { status: 204 });
  if (BOT.test(request.headers.get('user-agent') ?? '')) return new NextResponse(null, { status: 204 });
  // Only count hits sent from the site's own pages (blocks casual scripts; not a guarantee).
  const host = request.headers.get('host') ?? '';
  const from = request.headers.get('origin') ?? request.headers.get('referer') ?? '';
  try { if (!from || new URL(from).host !== host) return new NextResponse(null, { status: 204 }); }
  catch { return new NextResponse(null, { status: 204 }); }
  let kind = 'visit';
  try {
    const body = await request.json();
    if (body?.kind === 'submit_view') kind = 'submit_view';
  } catch { /* default visit */ }
  const supabase = createClient(supabaseUrl(), supabaseKey(), { auth: { persistSession: false } });
  await supabase.rpc('track', { p_kind: kind });
  return new NextResponse(null, { status: 204 });
}
