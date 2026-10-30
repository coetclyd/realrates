// Brand switch-over: send visitors on an old address to the primary domain, keeping the path and query.
// Plain JS (no TypeScript) so `node --test` can import it directly, like lib/pay.js.
//
// Off unless PRIMARY_HOST is set. Only hosts listed in LEGACY_HOSTS are redirected, so Vercel preview and
// per-deployment URLs keep working. Sign-in routes are never redirected: an email link or OAuth callback
// issued on the old address must finish on that address, or the login would be lost.

const NEVER_REDIRECT = ['/auth/', '/api/'];

/** Lower-case a host and drop any port. */
export function normaliseHost(host) {
  return String(host || '').trim().toLowerCase().replace(/:\d+$/, '');
}

/** Parse a comma-separated host list into normalised hosts. */
export function parseHosts(value) {
  return String(value || '')
    .split(',')
    .map(normaliseHost)
    .filter(Boolean);
}

/**
 * Returns the absolute URL to 308-redirect to, or null to serve the request normally.
 * @param {{ method?: string, host?: string, pathname?: string, search?: string,
 *           primaryHost?: string, legacyHosts?: string }} req
 */
export function legacyRedirectTarget({ method = 'GET', host, pathname = '/', search = '', primaryHost, legacyHosts }) {
  const primary = normaliseHost(primaryHost);
  if (!primary) return null;
  const current = normaliseHost(host);
  if (!current || current === primary) return null;
  if (!parseHosts(legacyHosts).includes(current)) return null;
  // Only plain page loads. Form posts and server actions finish where they started.
  if (method !== 'GET' && method !== 'HEAD') return null;
  if (NEVER_REDIRECT.some((prefix) => pathname === prefix.slice(0, -1) || pathname.startsWith(prefix))) return null;
  return `https://${primary}${pathname}${search}`;
}
