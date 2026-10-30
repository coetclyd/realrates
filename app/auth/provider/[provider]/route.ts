import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const providers = ['google', 'azure', 'facebook'] as const;

export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  const origin = new URL(request.url).origin;
  const nextParam = new URL(request.url).searchParams.get('next') ?? '/submit';
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/submit';
  if (!providers.some((p) => p === provider)) {
    return NextResponse.redirect(new URL('/login?error=provider', origin));
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as (typeof providers)[number],
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      ...(provider === 'azure' ? { scopes: 'email' } : {}),
    },
  });
  if (error || !data.url) {
    return NextResponse.redirect(new URL('/login?error=provider', origin));
  }
  return NextResponse.redirect(data.url);
}
