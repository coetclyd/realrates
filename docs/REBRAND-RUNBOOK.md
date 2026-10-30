# RealRates → ShiftRates switch-over runbook

Everything brand-related is driven by settings, so the switch is a settings change plus one redeploy. Nothing in the
database changes. Work through in order; every step needs Clyde's go-ahead.

## What this branch changes (safe to merge before the switch)

| Change | Effect while `NEXT_PUBLIC_SITE_NAME=RealRates` is still set | Effect after the switch |
|---|---|---|
| `SITE_NAME` default is now `ShiftRates` (`lib/options.ts`) | None: the env var wins | Default if the env var is removed |
| Tab and home-screen icons use the first letter of `SITE_NAME` | Still "R" | "S" |
| Share text after submitting a rate uses `SITE_NAME` | Still says RealRates | Says ShiftRates |
| `proxy.ts` 308-redirects old hosts to `PRIMARY_HOST` (`lib/host-redirect.js`) | Off: `PRIMARY_HOST` not set | `realrates.vercel.app/x` → `https://www.shiftrates.co.uk/x` |

Redirect rules (tested in `tests/host-redirect.test.mjs`):
- Only hosts in `LEGACY_HOSTS` (default `realrates.vercel.app`) redirect. Preview and deployment URLs never do.
- Only GET/HEAD. Form posts and server actions are untouched.
- Never `/auth/*` or `/api/*`, so an email link or Google sign-in started on the old address still completes there.
- Path and query are kept (`?utm_source=poster` survives).

## Already in place (30 Oct 2026)

- `shiftrates.co.uk` (Cloudflare) → Vercel: `www.shiftrates.co.uk` is the primary domain, the apex 308s to `www`.
  Cloudflare CNAMEs `@` and `www` are **DNS only** (grey cloud). Keep them grey.
- Resend sends from `noreply@shiftrates.co.uk`; Supabase custom SMTP uses it. `clyde@` and `support@` forward to Gmail
  via Cloudflare Email Routing. Do not add Resend's "receiving" MX: it would clash with the forwarding.
- Supabase redirect URLs include `https://www.shiftrates.co.uk/**`, `https://realrates.vercel.app/**` and the
  preview pattern.
- Google sign-in: Google Cloud project "ShiftRates" (owner clyde@shiftrates.co.uk), consent screen **in Testing**,
  enabled in Supabase. Shown only where `NEXT_PUBLIC_AUTH_PROVIDERS` includes `google` (Preview only so far).

## Switch-over steps

1. **Merge** this branch (and PR #7 if not already merged). With the env vars unchanged, the live site looks
   exactly the same. Check https://realrates.vercel.app still says RealRates.
2. **Supabase → Authentication → URL Configuration:** set **Site URL** to `https://www.shiftrates.co.uk`. Keep
   every existing redirect URL, including `https://realrates.vercel.app/**`, for links already sent.
3. **Google Cloud → Google Auth Platform → Audience:** click **Publish app** (Testing → In production). Basic
   scopes need no Google review. Do not upload a logo, which would trigger review.
4. **Vercel → realrates → Settings → Environment Variables (Production):**
   - `NEXT_PUBLIC_SITE_NAME` = `ShiftRates`
   - `NEXT_PUBLIC_SITE_URL` = `https://www.shiftrates.co.uk` (canonical links, sitemap, share links)
   - `NEXT_PUBLIC_CONTACT_EMAIL` = `support@shiftrates.co.uk`
   - `NEXT_PUBLIC_AUTH_PROVIDERS` = `google`
   - `PRIMARY_HOST` = `www.shiftrates.co.uk`
   - (`LEGACY_HOSTS` only if more old hosts need redirecting; default is `realrates.vercel.app`)
   All `NEXT_PUBLIC_*` must be **Config** type (they are built into the page, so not secrets).
5. **Redeploy Production** without build cache (`NEXT_PUBLIC_*` values are baked in at build time).
6. **Check, in a private window:**
   - `https://realrates.vercel.app/calculator?utm_source=poster` → 308 to `https://www.shiftrates.co.uk/calculator?utm_source=poster`
   - `https://shiftrates.co.uk/` → `https://www.shiftrates.co.uk/`
   - Header, tab title and icon say ShiftRates / "S"; the footer Privacy page names ShiftRates.
   - Email sign-in from `www.shiftrates.co.uk` → link lands on `www.shiftrates.co.uk/auth/finish` → signed in.
   - Continue with Google on `www.shiftrates.co.uk` → back on `/submit`, signed in.
   - An old email link to `realrates.vercel.app/auth/finish` still signs in (not redirected).
7. **After:** update the 4 scheduled marketing tasks (name, URLs; dedupe on both names), the launch plan text,
   and print the ShiftRates poster (QR → `https://www.shiftrates.co.uk/?utm_source=poster`).

## Rollback

Set `NEXT_PUBLIC_SITE_NAME` back to `RealRates`, delete `PRIMARY_HOST`, redeploy. No data is touched. Supabase
Site URL can be set back to `https://realrates.vercel.app`.
