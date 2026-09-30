'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function DashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-5 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-500/10">
        <AlertTriangle className="h-8 w-8 text-accent-500" />
      </div>
      <h1 className="mb-2 text-2xl font-bold text-foreground">Algo ha salido mal</h1>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        No hemos podido cargar esta pantalla. Tus datos están a salvo; inténtalo de nuevo en unos segundos.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => retry()}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground active:scale-95"
        >
          <RefreshCw className="h-4 w-4" /> Reintentar
        </button>
        <Link
          href="/dashboard"
          className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground active:scale-95"
        >
          Ir al inicio
        </Link>
      </div>
      {error.digest && <p className="mt-6 text-[10px] text-muted-foreground/60">Ref: {error.digest}</p>}
    </div>
  );
}
