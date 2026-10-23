import { ImageResponse } from 'next/og';
import { SITE_NAME } from '@/lib/options';

export const alt = 'What does that job actually pay? Real HGV driver pay rates.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Shared-link preview image (Facebook, WhatsApp, X). Matches the site's road-line look.
export default function OgImage() {
  const [first, ...rest] = SITE_NAME.match(/[A-Z][a-z]*|[a-z]+|\d+/g) ?? [SITE_NAME];
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', background: '#111316', display: 'flex', flexDirection: 'column', padding: '64px 72px', color: '#f3f3ef', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', fontSize: 52, fontWeight: 900 }}>
          <span>{first}</span><span style={{ color: '#ffd60a' }}>{rest.join('')}</span>
        </div>
        <div style={{ display: 'flex', marginTop: 70, fontSize: 84, fontWeight: 900, lineHeight: 1.05, letterSpacing: -2 }}>
          What does that job actually pay?
        </div>
        <div style={{ display: 'flex', marginTop: 28, fontSize: 36, color: '#a7acb4' }}>
          Real hourly rates from UK HGV drivers. Anonymous. Free.
        </div>
        <div style={{ display: 'flex', marginTop: 'auto', gap: 20 }}>
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} style={{ width: 52, height: 12, background: '#ffd60a' }} />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
