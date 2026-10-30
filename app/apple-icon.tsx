import { ImageResponse } from 'next/og';
import { SITE_NAME } from '@/lib/options';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', background: '#111316', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div style={{ display: 'flex', color: '#ffd60a', fontSize: 120, fontWeight: 900, lineHeight: 1 }}>{SITE_NAME.charAt(0).toUpperCase()}</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <div style={{ width: 32, height: 10, background: '#ffd60a' }} />
          <div style={{ width: 32, height: 10, background: '#ffd60a' }} />
          <div style={{ width: 32, height: 10, background: '#ffd60a' }} />
        </div>
      </div>
    ),
    size,
  );
}
