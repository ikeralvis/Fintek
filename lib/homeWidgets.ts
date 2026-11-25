/**
 * Cálculos de los widgets secundarios de Inicio: cobros de los próximos 7 días y resumen del
 * mes anterior. Funciones puras.
 */
import { addDays, addMonths, addWeeks, addYears, format, parseISO, startOfDay, subMonths } from 'date-fns';
import type { HomeSubscription, HomeTx } from '@/lib/homeInsights';

// ---------------------------------------------------------------------------------------------
// Próximos 7 días
// ---------------------------------------------------------------------------------------------

export type UpcomingCharge = { sub: HomeSubscription; date: string };
export type WeekDay = { date: string; charges: UpcomingCharge[]; total: number };

function step(date: Date, cycle: string): Date {
  if (cycle === 'weekly') return addWeeks(date, 1);
  if (cycle === 'bi-weekly') return addDays(date, 14);
  if (cycle === 'yearly') return addYears(date, 1);
  return addMonths(date, 1);
}

/** Los 7 días desde hoy con los pagos automáticos activos que caen en cada uno. */
export function upcomingWeek(subscriptions: HomeSubscription[], now = new Date()): WeekDay[] {
  const today = startOfDay(now);
  const days: WeekDay[] = Array.from({ length: 7 }, (_, i) => ({ date: format(addDays(today, i), 'yyyy-MM-dd'), charges: [], total: 0 }));
  const last = days[6].date;
  for (const sub of subscriptions) {
    if (sub.status !== 'active') continue;
    let d = parseISO(sub.next_payment_date);
    // Vencidos sin procesar: se muestran hoy.
    if (format(d, 'yyyy-MM-dd') < days[0].date) d = today;
    for (let i = 0; i < 8 && format(d, 'yyyy-MM-dd') <= last; i++) {
      const key = format(d, 'yyyy-MM-dd');
      const day = days.find(x => x.date === key);
      if (day) {
        day.charges.push({ sub, date: key });
        if ((sub.type || 'expense') !== 'income') day.total += Number(sub.amount);
      }
      d = step(d, sub.billing_cycle);
    }
  }
  return days;
}

// ---------------------------------------------------------------------------------------------
// Resumen del mes anterior
// ---------------------------------------------------------------------------------------------

export type MonthRecap = {
  monthKey: string; // yyyy-MM del mes resumido
  spent: number;
  income: number;
  /** Ingresos − gastos. */
  balance: number;
  topCategoryId: string | null;
  topCategoryAmount: number;
  txCount: number;
  /** Variación del gasto frente al mes anterior a ese (null si no hay datos). */
  spentDiffPct: number | null;
};

const total = (list: HomeTx[]) => list.reduce((a, t) => a + Number(t.amount), 0);

export function computeMonthRecap(allTransactions: HomeTx[], now = new Date()): MonthRecap | null {
  const unique = allTransactions.filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i);
  const monthKey = format(subMonths(now, 1), 'yyyy-MM');
  const beforeKey = format(subMonths(now, 2), 'yyyy-MM');
  const month = unique.filter(t => t.transaction_date.startsWith(monthKey));
  if (month.length < 5) return null;

  const expenses = month.filter(t => t.type === 'expense');
  const spent = total(expenses);
  const income = total(month.filter(t => t.type === 'income'));
  const byCat = expenses.reduce<Record<string, number>>((m, t) => {
    if (t.category_id) m[t.category_id] = (m[t.category_id] || 0) + Number(t.amount);
    return m;
  }, {});
  const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
  const before = total(unique.filter(t => t.type === 'expense' && t.transaction_date.startsWith(beforeKey)));

  return {
    monthKey,
    spent,
    income,
    balance: income - spent,
    topCategoryId: top?.[0] ?? null,
    topCategoryAmount: top?.[1] ?? 0,
    txCount: month.length,
    spentDiffPct: before >= 100 ? ((spent - before) / before) * 100 : null,
  };
}
