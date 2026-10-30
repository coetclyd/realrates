import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

import { enabledSocialProviders, type SocialProvider } from '@/lib/auth-providers';

export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  const origin = new URL(request.url).origin;
  const nextParam = new URL(request.url).searchParams.get('next') ?? '/submit';
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/submit';
  if (!enabledSocialProviders().includes(provider as SocialProvider)) {
    return NextResponse.redirect(new URL('/login?error=provider', origin));
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as SocialProvider,
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
