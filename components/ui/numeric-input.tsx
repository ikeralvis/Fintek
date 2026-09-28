'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface NumericInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'value' | 'onChange' | 'type' | 'inputMode'
  > {
  /** Valor numérico "crudo" parseable, ej. "1234.5" (separador decimal = punto). Vacío = sin valor. */
  value: string;
  /** Se invoca con el mismo formato "crudo" parseable (Number.parseFloat-friendly). */
  onValueChange: (value: string) => void;
  /** Símbolo de moneda fijado a la derecha. Pasa `null` para ocultarlo. */
  currencySymbol?: string | null;
  /** Clases adicionales para el símbolo de moneda (color, tamaño, posición). */
  currencyClassName?: string;
  /** Estilos inline para el símbolo de moneda (por si el tamaño debe garantizarse sí o sí). */
  currencyStyle?: React.CSSProperties;
  wrapperClassName?: string;
  /**
   * 'absolute' (por defecto): símbolo fijo al borde derecho del input, para inputs de ancho
   * completo tipo formulario. 'inline': símbolo en flujo normal justo después del número, para
   * usos tipo "importe hero" donde ambos deben centrarse juntos como una unidad.
   */
  layout?: 'absolute' | 'inline';
}

const MAX_DECIMALS = 2;

/** Convierte un valor crudo ("1234.5") al string mostrado en es-ES ("1.234,5"). */
function toDisplay(raw: string): string {
  if (!raw) return '';
  const negative = raw.startsWith('-');
  const [intPartRaw, decPartRaw = ''] = raw.replace('-', '').split('.');
  const intDigits = intPartRaw.replace(/\D/g, '');
  const grouped = intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const hasComma = raw.includes('.');
  const decDigits = decPartRaw.replace(/\D/g, '').slice(0, MAX_DECIMALS);
  return `${negative ? '-' : ''}${grouped || (hasComma ? '0' : '')}${hasComma ? ',' + decDigits : ''}`;
}

/** Normaliza el string tal y como queda en el <input> (con puntos de agrupación y coma decimal)
 *  a un valor crudo parseable con Number.parseFloat ("1234.5"). */
function toRaw(display: string): string {
  const negative = display.trim().startsWith('-');
  const cleaned = display.replace(/-/g, '');
  const commaIndex = cleaned.indexOf(',');
  const hasComma = commaIndex !== -1;
  const intPart = (hasComma ? cleaned.slice(0, commaIndex) : cleaned).replace(/\D/g, '');
  const decPart = (hasComma ? cleaned.slice(commaIndex + 1) : '').replace(/\D/g, '').slice(0, MAX_DECIMALS);
  const intDigits = intPart.replace(/^0+(?=\d)/, '');
  if (!intDigits && !hasComma) return '';
  return `${negative && (intDigits || decPart) ? '-' : ''}${intDigits || '0'}${hasComma ? '.' + decPart : ''}`;
}

/** Cuenta cuántos caracteres "significativos" (dígitos + coma decimal) preceden `pos` en `str`. */
function significantCountBefore(str: string, pos: number): number {
  let count = 0;
  for (let i = 0; i < pos && i < str.length; i++) {
    const ch = str[i];
    if ((ch >= '0' && ch <= '9') || ch === ',') count++;
  }
  return count;
}

/** Encuentra la posición en `str` justo después de `count` caracteres significativos. */
function positionForSignificantCount(str: string, count: number): number {
  if (count <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if ((ch >= '0' && ch <= '9') || ch === ',') {
      seen++;
      if (seen === count) return i + 1;
    }
  }
  return str.length;
}

/**
 * Input numérico especializado en importes monetarios:
 * - Teclado numérico nativo en móvil (inputMode="decimal").
 * - Formatea en vivo con separador de miles (.) y decimal (,), sin perder la posición del cursor.
 * - Expone/recibe un valor "crudo" parseable (Number.parseFloat) para no romper la lógica existente.
 */
export const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  (
    {
      value,
      onValueChange,
      currencySymbol = '€',
      currencyClassName,
      currencyStyle,
      className,
      wrapperClassName,
      placeholder = '0,00',
      disabled,
      layout = 'absolute',
      ...props
    },
    forwardedRef
  ) => {
    const innerRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(forwardedRef, () => innerRef.current as HTMLInputElement);

    const display = toDisplay(value);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const nextRawDisplay = input.value;
      const caret = input.selectionStart ?? nextRawDisplay.length;

      // Solo se permiten dígitos, un separador decimal (, o .) y el signo -.
      const sanitized = nextRawDisplay.replace(/[^\d,.-]/g, '');
      const significantBefore = significantCountBefore(sanitized, caret);

      const rawValue = toRaw(sanitized);
      const formatted = toDisplay(rawValue);

      onValueChange(rawValue);

      // Restaura la posición del cursor tras el re-render con el valor formateado.
      requestAnimationFrame(() => {
        if (!innerRef.current) return;
        const newPos = positionForSignificantCount(formatted, significantBefore);
        innerRef.current.setSelectionRange(newPos, newPos);
      });
    };

    return (
      <div className={cn(layout === 'inline' ? 'inline-flex items-baseline' : 'relative flex items-center', wrapperClassName)}>
        <input
          ref={innerRef}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={display}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full rounded-xl border border-input bg-card px-3.5 py-2 text-sm text-foreground shadow-none transition-colors tabular-nums placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50',
            layout === 'absolute' && currencySymbol && 'pr-9',
            className
          )}
          {...props}
        />
        {currencySymbol && (
          <span
            className={cn(
              layout === 'inline' ? 'pointer-events-none shrink-0 text-muted-foreground' : 'pointer-events-none absolute right-3.5 text-muted-foreground',
              currencyClassName
            )}
            style={currencyStyle}
          >
            {currencySymbol}
          </span>
        )}
      </div>
    );
  }
);
NumericInput.displayName = 'NumericInput';
