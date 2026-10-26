'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Counts one "visit" per browser tab session, and one "submit_view" per session when the rate form is opened.
// Uses sessionStorage only (no cookies, nothing personal).
export default function Tracker() {
  const path = usePathname();
  useEffect(() => {
    const send = (kind: string) => {
      try {
        const key = `rr_${kind}`;
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, '1');
      } catch { return; }
      const body = JSON.stringify({ kind });
      if (navigator.sendBeacon) navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
      else fetch('/api/track', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
    };
    if (path?.startsWith('/admin') || path?.startsWith('/auth')) return;
    send('visit');
    if (path === '/submit') send('submit_view');
  }, [path]);
  return null;
}
