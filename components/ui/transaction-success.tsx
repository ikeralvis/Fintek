'use client';

import { useEffect } from 'react';

type Props = {
  amount: number;
  type: 'expense' | 'income' | 'transfer';
  label?: string;
  onDone: () => void;
  /** ms hasta cerrarse solo */
  duration?: number;
};

const LABEL = { expense: 'Gasto guardado', income: 'Ingreso guardado', transfer: 'Transferencia hecha' };
const COLOR = { expense: '#f43f5e', income: '#10b981', transfer: '#71717a' };

/** Confirmación a pantalla completa: check animado, importe y concepto. Se cierra solo o al tocar. */
export function TransactionSuccess({ amount, type, label, onDone, duration = 2000 }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
  }, [onDone, duration]);

  const color = COLOR[type];
  const formatted = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={onDone}
      className="fixed inset-0 z-[200] flex cursor-pointer flex-col items-center justify-center gap-3 bg-background/95 backdrop-blur-sm"
      style={{ animation: 'tx-fade 200ms ease-out' }}
    >
      <style>{`
        @keyframes tx-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes tx-pop { 0% { transform: scale(.5); opacity: 0 } 60% { transform: scale(1.08) } 100% { transform: scale(1); opacity: 1 } }
        @keyframes tx-draw { to { stroke-dashoffset: 0 } }
        @keyframes tx-rise { from { transform: translateY(8px); opacity: 0 } to { transform: none; opacity: 1 } }
        @media (prefers-reduced-motion: reduce) { .tx-anim { animation: none !important; stroke-dashoffset: 0 !important } }
      `}</style>
      <div
        className="tx-anim flex h-24 w-24 items-center justify-center rounded-full"
        style={{ background: `${color}22`, animation: 'tx-pop 450ms cubic-bezier(.2,.9,.3,1.2) both' }}
      >
        <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path
            className="tx-anim"
            d="M5 12.5l4.5 4.5L19 7.5"
            style={{ strokeDasharray: 24, strokeDashoffset: 24, animation: 'tx-draw 400ms 250ms ease-out forwards' }}
          />
        </svg>
      </div>
      <p className="tx-anim text-sm font-semibold text-muted-foreground" style={{ animation: 'tx-rise 350ms 350ms ease-out both' }}>
        {LABEL[type]}
      </p>
      <p className="tx-anim text-4xl font-extrabold tabular-nums text-foreground" style={{ animation: 'tx-rise 350ms 450ms ease-out both' }}>
        {formatted}
      </p>
      {label && (
        <p className="tx-anim max-w-[80%] truncate text-sm text-muted-foreground" style={{ animation: 'tx-rise 350ms 550ms ease-out both' }}>
          {label}
        </p>
      )}
    </div>
  );
}
