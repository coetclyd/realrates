'use client';

import { useState } from 'react';

// WhatsApp + Facebook + copy link. Uses the phone's own share sheet when available.
export default function ShareButtons({ url, text, label = 'Share with other drivers' }: { url: string; text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const full = `${text} ${url}`;
  const canNative = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div className="share">
      <div className="share-label">{label}</div>
      <div className="choice-row">
        {canNative && (
          <button type="button" className="btn small" onClick={() => navigator.share({ text, url }).catch(() => {})}>Share…</button>
        )}
        <a className="btn small secondary" href={`https://wa.me/?text=${encodeURIComponent(full)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <a className="btn small secondary" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">Facebook</a>
        <button type="button" className="btn small secondary" onClick={async () => {
          try { await navigator.clipboard.writeText(full); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
        }}>{copied ? 'Copied ✓' : 'Copy link'}</button>
      </div>
    </div>
  );
}
