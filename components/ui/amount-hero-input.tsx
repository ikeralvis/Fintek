'use client';

import * as React from 'react';
import { NumericInput } from '@/components/ui/numeric-input';
import { cn } from '@/lib/utils';

type Tone = 'expense' | 'income' | 'transfer';

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  tone: Tone;
  autoFocus?: boolean;
  className?: string;
};

const TEXT: Record<Tone, string> = {
  expense: 'text-accent-600 dark:text-accent-400',
  income: 'text-secondary-600 dark:text-secondary-400',
  transfer: 'text-primary',
};
const CURRENCY: Record<Tone, string> = {
  expense: 'text-accent-500/60 dark:text-accent-400/60',
  income: 'text-secondary-500/60 dark:text-secondary-400/60',
  transfer: 'text-primary/50',
};
const GLOW: Record<Tone, string> = {
  expense: '#f43f5e26',
  income: '#10b98126',
  transfer: '#71717a26',
};

/** Caracteres que ocupa el importe ya formateado en es-ES ("12345.6" → "12.345,6"), o el placeholder. */
function displayLength(raw: string): number {
  if (!raw) return 3.3; // "0,00": 3 dígitos + coma
  const [int = '', dec] = raw.replace('-', '').split('.');
  const intLen = Math.max(1, int.length);
  const separators = Math.floor((intLen - 1) / 3);
  // Los separadores (. y ,) miden ~0.3ch, no 1ch: contarlos enteros dejaba holgura a la izquierda
  // y desplazaba el número a la derecha a partir de 4 cifras.
  return intLen + separators * 0.3 + (dec !== undefined ? 0.3 + dec.length : 0);
}

/**
 * Importe "hero" compartido por Nueva Transacción y Editar Transacción: número grande alineado a
 * la derecha con el € pegado justo después (se centran juntos y no saltan al teclear), halo de
 * color según el tipo y ancho en `ch` según lo escrito para no provocar scroll horizontal.
 * Tamaños críticos inline para no depender de que el CSS de Tailwind esté recompilado.
 */
export const AmountHeroInput = React.forwardRef<HTMLInputElement, Props>(
  ({ value, onValueChange, tone, autoFocus, className }, ref) => {
    const displayLen = displayLength(value);
    // El número se encoge solo cuando es largo: el tamaño máximo cabe en el ancho real del
    // contenedor (cqw), contando dígitos + el € pegado detrás. Así nunca se corta ni desborda.
    const fontSize = `min(clamp(2.75rem, 14vw, 4.5rem), ${(100 / (displayLen * 0.62 + 1.3)).toFixed(2)}cqw)`;

    return (
      <div className={cn('relative py-4', className)} style={{ containerType: 'inline-size' }}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-36 w-60 max-w-full rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, ${GLOW[tone]} 0%, transparent 72%)`, transition: 'background 400ms ease' }}
        />
        <div className="relative flex min-w-0 items-baseline justify-center" style={{ fontSize, transition: 'font-size 150ms ease-out' }}>
          <NumericInput
            ref={ref}
            value={value}
            onValueChange={onValueChange}
            placeholder="0,00"
            autoFocus={autoFocus}
            currencySymbol="€"
            layout="inline"
            currencyClassName={cn('ml-1.5 font-bold transition-colors duration-300', CURRENCY[tone])}
            currencyStyle={{ fontSize: '0.48em' }}
            wrapperClassName="max-w-full"
            style={{ fontSize: '1em', width: `${displayLen + 0.4}ch`, maxWidth: '100%', lineHeight: 1 }}
            className={cn(
              'h-auto min-w-0 rounded-none border-none bg-transparent p-0 text-center font-extrabold tabular-nums tracking-tight shadow-none placeholder:text-muted-foreground/30 focus-visible:ring-0 transition-colors duration-300',
              TEXT[tone]
            )}
          />
        </div>
      </div>
    );
  }
);
AmountHeroInput.displayName = 'AmountHeroInput';
