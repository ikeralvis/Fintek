'use client';

// Último recurso: sustituye al root layout, así que lleva su propio <html> y estilos inline.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 20px',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#fafafa',
          color: '#18181b',
        }}
      >
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Fintek no puede cargar ahora mismo</h1>
        <p style={{ fontSize: 14, color: '#71717a', maxWidth: 360, marginBottom: 24 }}>
          Ha ocurrido un error inesperado. Inténtalo de nuevo en unos segundos.
        </p>
        <button
          onClick={() => retry()}
          style={{ padding: '10px 20px', borderRadius: 12, border: 0, background: '#18181b', color: '#fff', fontWeight: 600 }}
        >
          Reintentar
        </button>
        {error.digest && <p style={{ marginTop: 24, fontSize: 10, color: '#a1a1aa' }}>Ref: {error.digest}</p>}
      </body>
    </html>
  );
}
