import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

// Email link target. Works in any browser because it uses the token in the link,
// not a code stored in the browser that requested it.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = (searchParams.get('type') ?? 'email') as EmailOtpType;
  const nextParam = searchParams.get('next') ?? '/submit';
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/submit';

  if (tokenHash) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=link&next=${encodeURIComponent(next)}`);
}
