/**
 * Convierte un error del servidor en un mensaje apto para el cliente.
 *
 * Los mensajes crudos de PostgREST/Postgres revelan nombres de tablas, constraints y políticas,
 * así que nunca se devuelven tal cual: se registran en el servidor y el cliente recibe un texto
 * genérico. La excepción son los `raise exception` de nuestras propias funciones SQL
 * (SQLSTATE P0001), que están escritos para el usuario ("Saldo insuficiente…").
 */
const KNOWN_CODES: Record<string, string> = {
  '23505': 'Ya existe un elemento con esos datos',
  '23503': 'Uno de los elementos indicados no existe',
  '23514': 'Alguno de los valores no es válido',
  '42501': 'No tienes permiso para realizar esta operación',
};

export function toActionError(
  err: unknown,
  context: string,
  fallback = 'No se pudo completar la operación. Inténtalo de nuevo.'
): string {
  console.error(`[${context}]`, err);

  const e = err as { code?: unknown; message?: unknown } | null;
  const code = typeof e?.code === 'string' ? e.code : undefined;

  if (code === 'P0001' && typeof e?.message === 'string' && e.message) return e.message;
  if (code && KNOWN_CODES[code]) return KNOWN_CODES[code];
  return fallback;
}
