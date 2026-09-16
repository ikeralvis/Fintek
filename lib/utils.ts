import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formato monetario canónico (es-ES): 2 decimales con coma, punto de millar y "€" a la derecha
 * separado por un espacio (ej. "37.897,09 €"). Al renderizarlo, añade la clase `tabular-nums`
 * al elemento contenedor para evitar layout shift al cambiar de valor.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}