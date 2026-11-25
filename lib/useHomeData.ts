'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { format, startOfMonth, subMonths, endOfMonth } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import type { HomeSubscription, HomeTx } from '@/lib/homeInsights';
import type { GoalPocket } from '@/lib/savingsGoals';
import type { PlanSettings } from '@/lib/budgetPlan';

export type HomeBudget = { id: string; category_id: string; amount: number; is_savings: boolean };

export type HomeData = {
  subscriptions: HomeSubscription[];
  budgets: HomeBudget[];
  monthlyIncomeSetting: number;
  /** Plan del mes de Presupuestos (ingreso, margen, ahorro previsto), si existe. */
  planSettings: PlanSettings | null;
  /**
   * Movimientos del mes anterior que NO están en DashboardContext. El contexto carga el año en
   * curso, así que solo hace falta pedirlos en enero (diciembre es del año anterior); el resto
   * del año va vacío y los cálculos usan los del contexto.
   */
  prevMonthTransactions: HomeTx[];
  /** Apartados con importe objetivo (objetivos de ahorro). */
  goals: GoalPocket[];
};

// ---------------------------------------------------------------------------------------------
// Caché compartida (stale-while-revalidate): Inicio, la campana de avisos y Presupuestos leen
// de aquí, así que una sola tanda de peticiones sirve a todos. Con datos de menos de FRESH_MS
// no se pide nada; si son más viejos se enseñan igual y se refrescan por detrás.
// ---------------------------------------------------------------------------------------------

const FRESH_MS = 60_000;

type Entry = { data: HomeData | null; at: number; inflight: Promise<HomeData> | null };
const cache = new Map<string, Entry>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());

async function fetchHomeData(userId: string): Promise<HomeData> {
  const supabase = createClient();
  const now = new Date();
  const prev = subMonths(now, 1);
  const needsPrevMonth = now.getMonth() === 0;

  const [subs, budgets, settings, prevTx, pockets] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('id, name, amount, billing_cycle, next_payment_date, status, type, is_subscription, category_id')
      .eq('user_id', userId),
    supabase.from('budgets').select('id, category_id, amount, is_savings').eq('user_id', userId),
    // select('*'): savings_target puede no existir si no se ha ejecutado sql/budget_savings_target.sql.
    supabase.from('budget_settings').select('*').eq('user_id', userId).maybeSingle(),
    needsPrevMonth
      ? supabase
        .from('transactions')
        .select('id, type, amount, transaction_date, category_id, description')
        .eq('user_id', userId)
        .gte('transaction_date', format(startOfMonth(prev), 'yyyy-MM-dd'))
        .lte('transaction_date', format(endOfMonth(prev), 'yyyy-MM-dd'))
      : Promise.resolve({ data: [] as HomeTx[] }),
    // select('*'): target_date puede no existir si no se ha ejecutado sql/pocket_target_date.sql.
    supabase.from('account_pockets').select('*').eq('user_id', userId).not('target_amount', 'is', null).order('created_at'),
  ]);

  return {
    subscriptions: (subs.data || []) as HomeSubscription[],
    budgets: (budgets.data || []) as HomeBudget[],
    monthlyIncomeSetting: Number(settings.data?.monthly_income) || 0,
    planSettings: (settings.data as PlanSettings | null) ?? null,
    prevMonthTransactions: (prevTx.data || []) as HomeTx[],
    goals: (pockets.data || []) as GoalPocket[],
  };
}

function revalidate(userId: string): Promise<HomeData> {
  const entry = cache.get(userId) ?? { data: null, at: 0, inflight: null };
  if (entry.inflight) return entry.inflight; // ya hay una petición en marcha: se comparte
  entry.inflight = fetchHomeData(userId)
    .then(data => {
      cache.set(userId, { data, at: Date.now(), inflight: null });
      notify();
      return data;
    })
    .catch(err => {
      entry.inflight = null;
      throw err;
    });
  cache.set(userId, entry);
  return entry.inflight;
}

/** Marca los datos como viejos y los vuelve a pedir (llamar tras guardar cambios). */
export function invalidateHomeData() {
  for (const [userId, entry] of cache) {
    entry.at = 0;
    revalidate(userId).catch(() => { /* se reintentará en el próximo uso */ });
  }
}

/**
 * Datos extra de Inicio/Presupuestos que no están en DashboardContext, con caché compartida.
 * Devuelve null solo la primera vez, mientras llega la primera respuesta.
 */
export function useHomeData(userId: string): HomeData | null {
  const data = useSyncExternalStore(
    cb => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => cache.get(userId)?.data ?? null,
    () => null,
  );
  useEffect(() => {
    const entry = cache.get(userId);
    if (entry?.data && Date.now() - entry.at < FRESH_MS) return;
    revalidate(userId).catch(() => { /* se reintenta al volver a montar */ });
  }, [userId]);
  return data;
}

// ---------------------------------------------------------------------------------------------
// Medias de gasto por categoría (Presupuestos): son caras de calcular (12 meses de movimientos)
// y cambian poco, así que se guardan 10 minutos.
// ---------------------------------------------------------------------------------------------

const AVERAGES_MS = 10 * 60_000;
let averagesCache: { userId: string; at: number; data: Record<string, number> } | null = null;

export function getCachedAverages(userId: string): Record<string, number> | null {
  return averagesCache && averagesCache.userId === userId && Date.now() - averagesCache.at < AVERAGES_MS
    ? averagesCache.data
    : null;
}

export function setCachedAverages(userId: string, data: Record<string, number>) {
  averagesCache = { userId, at: Date.now(), data };
}
