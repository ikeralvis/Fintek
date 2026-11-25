'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { StatTx } from '@/lib/statistics';

/** Movimiento de un año anterior (sin joins: categoría y cuenta se resuelven por id). */
export type PastTx = StatTx & { account_id?: string | null; related_account_id?: string | null };

/**
 * Movimientos de años anteriores al actual (DashboardContext solo carga el año en curso), para
 * navegar y comparar en Estadísticas y Movimientos. Cada año se pide UNA vez por sesión y se
 * comparte entre pantallas; "todo el histórico" se pide de una sola vez y sirve para cualquier año.
 */
type Entry = { data: PastTx[] | null; inflight: boolean };
const cache = new Map<string, Entry>(); // `${userId}:${year}` o `${userId}:past`
const listeners = new Set<() => void>();
let version = 0;
const notify = () => { version++; listeners.forEach(l => l()); };

const COLUMNS = 'id, type, amount, transaction_date, category_id, description, account_id, related_account_id';

function load(userId: string, key: 'past' | number) {
  const cacheKey = `${userId}:${key}`;
  const entry = cache.get(cacheKey);
  if (entry?.data || entry?.inflight) return;
  // Si ya está todo el histórico, cualquier año sale de ahí: no se pide nada.
  if (key !== 'past' && cache.get(`${userId}:past`)?.data) return;
  cache.set(cacheKey, { data: null, inflight: true });
  const currentYear = new Date().getFullYear();
  let q = createClient().from('transactions').select(COLUMNS).eq('user_id', userId);
  q = key === 'past'
    ? q.lt('transaction_date', `${currentYear}-01-01`)
    : q.gte('transaction_date', `${key}-01-01`).lte('transaction_date', `${key}-12-31`);
  q.then(({ data }) => {
    cache.set(cacheKey, { data: (data || []) as PastTx[], inflight: false });
    notify();
  });
}

/**
 * Devuelve los movimientos de esos años anteriores al actual (el año en curso ya está en el
 * contexto). Con `allPast`, todo lo anterior al año actual en una sola petición.
 */
export function useYearTransactions(
  userId: string,
  years: number[],
  options: { allPast?: boolean } = {},
): { transactions: PastTx[]; loading: boolean } {
  const currentYear = new Date().getFullYear();
  const allPast = !!options.allPast;
  const needed = useMemo(() => [...new Set(years)].filter(y => y < currentYear).sort(), [years, currentYear]);
  const v = useSyncExternalStore(
    cb => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => version,
    () => 0,
  );

  useEffect(() => {
    if (allPast) load(userId, 'past');
    else for (const y of needed) load(userId, y);
    // `v`: tras invalidar la caché se vuelve a pedir lo que falte (load no repite peticiones).
  }, [userId, needed, allPast, v]);

  return useMemo(() => {
    const past = cache.get(`${userId}:past`)?.data;
    if (allPast) return { transactions: past ?? [], loading: !past };
    if (past) {
      return { transactions: past.filter(t => needed.includes(Number(t.transaction_date.slice(0, 4)))), loading: false };
    }
    const entries = needed.map(y => cache.get(`${userId}:${y}`));
    return { transactions: entries.flatMap(e => e?.data ?? []), loading: entries.some(e => !e?.data) };
    // `v` cambia cuando llega algo nuevo a la caché.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needed, userId, allPast, v]);
}

/** Vacía la caché de años pasados (tras editar, borrar o convertir movimientos de esos años). */
export function invalidateYearTransactions() {
  cache.clear();
  notify();
}
