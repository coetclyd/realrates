import { ImageResponse } from 'next/og';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

// Browser tab icon: yellow road-line "R" on dark.
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', background: '#111316', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, flexDirection: 'column' }}>
        <div style={{ display: 'flex', color: '#ffd60a', fontSize: 44, fontWeight: 900, lineHeight: 1 }}>R</div>
        <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
          <div style={{ width: 12, height: 4, background: '#ffd60a' }} />
          <div style={{ width: 12, height: 4, background: '#ffd60a' }} />
          <div style={{ width: 12, height: 4, background: '#ffd60a' }} />
        </div>
      </div>
    ),
    size,
  );
}
