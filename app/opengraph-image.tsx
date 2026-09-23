import { ImageResponse } from 'next/og';

export const alt = 'Fintek — Gestor Financiero Personal';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#08090b',
          backgroundImage: 'radial-gradient(circle at 50% 20%, rgba(99,102,241,0.25), transparent 60%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 20,
              background: 'linear-gradient(135deg, #10b981, #6366f1)',
              display: 'flex',
            }}
          />
          <div style={{ display: 'flex', fontSize: 84, fontWeight: 700, color: '#fff' }}>Fintek</div>
        </div>
        <div style={{ display: 'flex', marginTop: 28, fontSize: 32, color: '#a1a1aa' }}>
          Tus finanzas, bajo control absoluto
        </div>
      </div>
    ),
    { ...size }
  );
}
