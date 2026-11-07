'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Counts one "visit" per browser tab session, and one "submit_view" per session when the rate form is opened.
// A tagged link (?utm_source=poster etc.) is also counted once per source per session: a daily count, no personal data.
// Uses sessionStorage only (no cookies, nothing personal).
export default function Tracker() {
  const path = usePathname();
  useEffect(() => {
    const send = (kind: string, extra: Record<string, string> = {}) => {
      try {
        const key = `rr_${kind}`;
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, '1');
      } catch { return; }
      const body = JSON.stringify({ kind, ...extra });
      if (navigator.sendBeacon) navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
      else fetch('/api/track', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
    };
    if (path?.startsWith('/admin') || path?.startsWith('/auth')) return;
    send('visit');
    if (path === '/submit') send('submit_view');
    // Each tagged link (?utm_source=) counts once per tab session, even if the session started untagged.
    let source = '';
    try { source = (new URLSearchParams(window.location.search).get('utm_source') ?? '').trim().toLowerCase().slice(0, 32); } catch { /* none */ }
    if (source) send(`src_${source}`, { source });
  }, [path]);
  return null;
}
