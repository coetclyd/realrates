import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { legacyRedirectTarget } from '@/lib/host-redirect';

// 1. Brand switch-over: old addresses 308 to PRIMARY_HOST (off unless PRIMARY_HOST is set; sign-in routes excluded).
// 2. Refreshes the Supabase login session on each request so magic-link logins stay signed in.
export async function proxy(request: NextRequest) {
  const target = legacyRedirectTarget({
    method: request.method,
    host: request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '',
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    primaryHost: process.env.PRIMARY_HOST,
    legacyHosts: process.env.LEGACY_HOSTS ?? 'realrates.vercel.app',
  });
  if (target) return NextResponse.redirect(target, 308);

  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet) {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|ico)$).*)'],
};
