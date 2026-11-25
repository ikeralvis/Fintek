/**
 * Cálculos de la pantalla de Inicio: dinero disponible para gastar en el mes, ritmo de gasto
 * frente al mes anterior e "insights" cortos. Funciones puras (sin Supabase ni React) para
 * poder testearlas y reutilizarlas.
 */
import {
  addDays, addMonths, addWeeks, addYears, differenceInCalendarDays, endOfMonth, format,
  getDate, getDaysInMonth, parseISO, startOfDay, subDays, subMonths,
} from 'date-fns';

export type HomeTx = {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  transaction_date: string; // yyyy-MM-dd
  category_id?: string | null;
  description?: string | null;
};

export type HomeSubscription = {
  id: string;
  name: string;
  amount: number;
  billing_cycle: string;
  next_payment_date: string;
  status: string;
  type?: 'expense' | 'income' | 'transfer' | null;
  is_subscription?: boolean | null;
  category_id?: string | null;
};

export type HomeCategory = { id: string; name: string; icon?: string; color?: string };

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');
const sum = (list: { amount: number }[]) => list.reduce((a, t) => a + Number(t.amount), 0);

export function monthlyEquivalent(sub: { amount: number; billing_cycle: string }): number {
  const amount = Number(sub.amount);
  if (sub.billing_cycle === 'weekly') return (amount * 52) / 12;
  if (sub.billing_cycle === 'bi-weekly') return (amount * 26) / 12;
  if (sub.billing_cycle === 'yearly') return amount / 12;
  return amount;
}

function nextOccurrence(date: Date, cycle: string): Date {
  if (cycle === 'weekly') return addWeeks(date, 1);
  if (cycle === 'bi-weekly') return addDays(date, 14);
  if (cycle === 'yearly') return addYears(date, 1);
  return addMonths(date, 1);
}

/** Importe que un pago automático aún cargará desde hoy hasta fin de mes (incluye los vencidos sin procesar). */
export function pendingThisMonth(sub: HomeSubscription, now: Date): number {
  if (sub.status !== 'active') return 0;
  const monthEnd = endOfMonth(now);
  let date = parseISO(sub.next_payment_date);
  let total = 0;
  for (let i = 0; i < 10 && date <= monthEnd; i++) {
    total += Number(sub.amount);
    date = nextOccurrence(date, sub.billing_cycle);
  }
  return total;
}

/**
 * Categorías que cuentan como ahorro: las de presupuestos marcados como ahorro y, además, las que
 * se llaman "Ahorro…" o "Inversión…". Un traspaso con cualquier otra categoría (p. ej. entre
 * cuentas propias o a un apartado) es solo mover dinero y no se cuenta como ahorrado.
 */
export function savingsCategoryIds(
  categories: { id: string; name: string }[],
  budgets: { category_id: string; is_savings: boolean }[],
): Set<string> {
  const ids = new Set(budgets.filter(b => b.is_savings).map(b => b.category_id));
  for (const c of categories) {
    const n = c.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (n.includes('ahorro') || n.includes('inversion')) ids.add(c.id);
  }
  return ids;
}

/** Mínimo de datos del mes anterior para que la comparación tenga sentido. */
const MIN_PREV_EXPENSE_DAYS = 8;
const MIN_PREV_TOTAL = 100;

export type MonthOverview = {
  /** Ingreso de referencia del mes (configurado, recibido o media de meses anteriores). */
  expectedIncome: number;
  incomeSource: 'settings' | 'received' | 'average' | 'none';
  spent: number;
  saved: number;
  pendingFixed: number;
  pendingSavings: number;
  available: number;
  perDay: number;
  daysLeft: number;
  /** Gasto acumulado por día del mes actual (índice 0 = día 1), solo hasta hoy. */
  cumulativeThis: number[];
  /** Gasto acumulado por día del mes anterior completo. */
  cumulativePrev: number[];
  /** Diferencia relativa con el mes anterior a la misma altura del mes (null si no hay base). */
  paceDiffPct: number | null;
  prevSameDay: number;
  /** Hay suficientes movimientos del mes pasado para comparar. */
  hasPrevData: boolean;
  /** Cuánto ha superado el gasto a los ingresos del mes (0 si no). */
  overspentIncome: number;
};

function cumulativeByDay(expenses: HomeTx[], days: number): number[] {
  const perDay = new Array(days).fill(0);
  for (const t of expenses) {
    const d = Number(t.transaction_date.slice(8, 10));
    if (d >= 1 && d <= days) perDay[d - 1] += Number(t.amount);
  }
  let acc = 0;
  return perDay.map(v => (acc += v));
}

export function computeMonthOverview({
  now, transactions, prevMonthTransactions, subscriptions, monthlyIncomeSetting, savingsCategories = new Set<string>(),
}: {
  now: Date;
  /** Movimientos cargados en el dashboard (año en curso). */
  transactions: HomeTx[];
  /** Movimientos del mes anterior (se piden aparte porque en enero no están en `transactions`). */
  prevMonthTransactions: HomeTx[];
  subscriptions: HomeSubscription[];
  monthlyIncomeSetting: number;
  savingsCategories?: Set<string>;
}): MonthOverview {
  const monthPrefix = format(now, 'yyyy-MM');
  const monthTx = transactions.filter(t => t.transaction_date.startsWith(monthPrefix));
  const spent = sum(monthTx.filter(t => t.type === 'expense'));
  const saved = sum(monthTx.filter(t => t.type === 'transfer' && !!t.category_id && savingsCategories.has(t.category_id)));
  const received = sum(monthTx.filter(t => t.type === 'income'));

  const active = subscriptions.filter(s => s.status === 'active');
  const pendingFixed = active.filter(s => (s.type || 'expense') === 'expense').reduce((a, s) => a + pendingThisMonth(s, now), 0);
  const pendingSavings = active.filter(s => s.type === 'transfer').reduce((a, s) => a + pendingThisMonth(s, now), 0);
  const pendingIncome = active.filter(s => s.type === 'income').reduce((a, s) => a + pendingThisMonth(s, now), 0);

  // Ingreso de los 3 meses anteriores con datos (para quien no ha configurado su sueldo).
  const prevIncomes: number[] = [];
  for (let i = 1; i <= 3; i++) {
    const prefix = format(subMonths(now, i), 'yyyy-MM');
    const source = i === 1 ? [...prevMonthTransactions, ...transactions] : transactions;
    const income = sum(source.filter(t => t.type === 'income' && t.transaction_date.startsWith(prefix)));
    if (income > 0) prevIncomes.push(income);
  }
  const averageIncome = prevIncomes.length ? prevIncomes.reduce((a, b) => a + b, 0) / prevIncomes.length : 0;

  let expectedIncome = 0;
  let incomeSource: MonthOverview['incomeSource'] = 'none';
  if (monthlyIncomeSetting > 0) { expectedIncome = monthlyIncomeSetting; incomeSource = 'settings'; }
  else if (averageIncome > 0) { expectedIncome = averageIncome; incomeSource = 'average'; }
  // Si ya ha entrado (o va a entrar seguro) más de lo previsto, manda lo real.
  if (received + pendingIncome > expectedIncome) { expectedIncome = received + pendingIncome; incomeSource = 'received'; }

  // El ahorro programado (aún no hecho) no se descuenta: solo lo ya ahorrado y los cobros fijos pendientes.
  const available = expectedIncome - spent - saved - pendingFixed;
  const daysInMonth = getDaysInMonth(now);
  const today = getDate(now);
  const daysLeft = daysInMonth - today + 1;
  const perDay = available > 0 ? available / daysLeft : 0;

  const cumulativeThis = cumulativeByDay(monthTx.filter(t => t.type === 'expense'), daysInMonth).slice(0, today);
  const prevMonth = subMonths(now, 1);
  const prevPrefix = format(prevMonth, 'yyyy-MM');
  const prevExpenses = [...prevMonthTransactions, ...transactions]
    .filter((t, i, arr) => t.type === 'expense' && t.transaction_date.startsWith(prevPrefix) && arr.findIndex(x => x.id === t.id) === i);
  const hasPrevData = new Set(prevExpenses.map(t => t.transaction_date)).size >= MIN_PREV_EXPENSE_DAYS
    && sum(prevExpenses) >= MIN_PREV_TOTAL;
  const cumulativePrev = hasPrevData ? cumulativeByDay(prevExpenses, getDaysInMonth(prevMonth)) : [];
  const prevSameDay = cumulativePrev[Math.min(today, cumulativePrev.length) - 1] ?? 0;
  const paceDiffPct = hasPrevData && prevSameDay >= 20 ? ((spent - prevSameDay) / prevSameDay) * 100 : null;
  const overspentIncome = expectedIncome > 0 ? Math.max(0, spent - expectedIncome) : 0;

  return {
    expectedIncome, incomeSource, spent, saved, pendingFixed, pendingSavings, available, perDay, daysLeft,
    cumulativeThis, cumulativePrev, paceDiffPct, prevSameDay, hasPrevData, overspentIncome,
  };
}

// ---------------------------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------------------------

export type Insight = {
  id: string;
  tone: 'good' | 'bad' | 'neutral';
  kind: 'pace' | 'up' | 'down' | 'streak' | 'big' | 'share' | 'subs' | 'savings';
  title: string;
  body: string;
  href?: string;
  categoryId?: string;
};

const pct = (n: number) => `${Math.round(Math.abs(n))} %`;
const eur = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

export function computeInsights({
  now, transactions, prevMonthTransactions, categories, subscriptions, overview,
}: {
  now: Date;
  transactions: HomeTx[];
  prevMonthTransactions: HomeTx[];
  categories: HomeCategory[];
  subscriptions: HomeSubscription[];
  overview: MonthOverview;
}): Insight[] {
  const list: Insight[] = [];
  const catName = (id?: string | null) => categories.find(c => c.id === id)?.name;
  const today = getDate(now);
  const monthPrefix = format(now, 'yyyy-MM');
  const prevPrefix = format(subMonths(now, 1), 'yyyy-MM');
  const expensesThis = transactions.filter(t => t.type === 'expense' && t.transaction_date.startsWith(monthPrefix));
  const all = [...prevMonthTransactions, ...transactions].filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i);
  const expensesPrevToDay = all.filter(t =>
    t.type === 'expense' && t.transaction_date.startsWith(prevPrefix) && Number(t.transaction_date.slice(8, 10)) <= today);

  // 1) Categorías que suben o bajan respecto al mes pasado a la misma altura del mes.
  const byCat = (txs: HomeTx[]) => txs.reduce<Record<string, number>>((m, t) => {
    if (t.category_id) m[t.category_id] = (m[t.category_id] || 0) + Number(t.amount);
    return m;
  }, {});
  const thisCat = byCat(expensesThis);
  const prevCat = byCat(expensesPrevToDay);
  const changes = Object.keys({ ...thisCat, ...prevCat })
    .map(id => ({ id, now: thisCat[id] || 0, prev: prevCat[id] || 0 }))
    .filter(c => c.prev >= 10 && Math.abs(c.now - c.prev) >= 15 && catName(c.id))
    .map(c => ({ ...c, diff: ((c.now - c.prev) / c.prev) * 100 }));
  const up = changes.filter(c => c.diff >= 25).sort((a, b) => (b.now - b.prev) - (a.now - a.prev))[0];
  const down = changes.filter(c => c.diff <= -25).sort((a, b) => (a.now - a.prev) - (b.now - b.prev))[0];
  if (up && overview.hasPrevData) list.push({
    id: `up-${up.id}`, tone: 'bad', kind: 'up', categoryId: up.id,
    title: `${catName(up.id)}: +${pct(up.diff)}`,
    body: `Llevas ${eur(up.now)} este mes, ${eur(up.now - up.prev)} más que a estas alturas del mes pasado.`,
    href: '/dashboard/estadisticas',
  });
  if (down && overview.hasPrevData) list.push({
    id: `down-${down.id}`, tone: 'good', kind: 'down', categoryId: down.id,
    title: `${catName(down.id)}: −${pct(down.diff)}`,
    body: `Gastas ${eur(down.prev - down.now)} menos que el mes pasado por estas fechas. ¡Bien!`,
    href: '/dashboard/estadisticas',
  });

  // 1b) Ritmo general frente al mes pasado. Solo diferencias creíbles: por encima del 100 % casi
  // siempre es que el mes pasado está incompleto en la app, no que se gaste el doble.
  const pace = overview.paceDiffPct;
  if (pace !== null && Math.abs(pace) >= 10 && Math.abs(pace) <= 100) list.push({
    id: 'pace', tone: pace < 0 ? 'good' : 'bad', kind: 'pace',
    title: `Gastas un ${pct(pace)} ${pace < 0 ? 'menos' : 'más'} que el mes pasado`,
    body: `Llevas ${eur(overview.spent)}; a estas alturas del mes pasado ibas por ${eur(overview.prevSameDay)}.`,
    href: '/dashboard/estadisticas',
  });

  // 2) Racha de días sin gastos (contando desde hoy hacia atrás).
  const expenseDays = new Set(all.filter(t => t.type === 'expense').map(t => t.transaction_date));
  let streak = 0;
  for (let d = startOfDay(now); streak < 60 && !expenseDays.has(ymd(d)); d = subDays(d, 1)) streak++;
  if (streak >= 2 && streak < 60) list.push({
    id: 'streak', tone: 'good', kind: 'streak',
    title: `${streak} días sin gastos`,
    body: 'Cada día sin gastar es dinero que se queda para tus objetivos.',
  });

  // 3) Mayor gasto de los últimos 7 días.
  const weekAgo = ymd(subDays(now, 6));
  const weekExpenses = all.filter(t => t.type === 'expense' && t.transaction_date >= weekAgo);
  const biggest = weekExpenses.sort((a, b) => Number(b.amount) - Number(a.amount))[0];
  if (biggest && weekExpenses.length >= 3) {
    const label = biggest.description?.trim() || catName(biggest.category_id) || 'Un gasto';
    const days = differenceInCalendarDays(startOfDay(now), parseISO(biggest.transaction_date));
    list.push({
      id: `big-${biggest.id}`, tone: 'neutral', kind: 'big', categoryId: biggest.category_id || undefined,
      title: `Mayor gasto de la semana: ${eur(Number(biggest.amount))}`,
      body: `${label}, ${days === 0 ? 'hoy' : days === 1 ? 'ayer' : `hace ${days} días`}.`,
      href: '/dashboard/transacciones',
    });
  }

  // 4) Categoría que más pesa en el mes.
  const totalThis = sum(expensesThis);
  const topCat = Object.entries(thisCat).sort((a, b) => b[1] - a[1])[0];
  if (topCat && totalThis >= 50 && catName(topCat[0])) {
    const share = (topCat[1] / totalThis) * 100;
    if (share >= 25) list.push({
      id: `share-${topCat[0]}`, tone: 'neutral', kind: 'share', categoryId: topCat[0],
      title: `${catName(topCat[0])} se lleva el ${pct(share)}`,
      body: `De cada 10 € que gastas este mes, ${Math.round(share / 10)} van a ${catName(topCat[0])?.toLowerCase()}.`,
      href: '/dashboard/estadisticas',
    });
  }

  // 5) Coste anual de las suscripciones.
  const subsYear = subscriptions
    .filter(s => s.status === 'active' && (s.type || 'expense') === 'expense' && (s.is_subscription ?? true))
    .reduce((a, s) => a + monthlyEquivalent(s) * 12, 0);
  if (subsYear >= 60) list.push({
    id: 'subs', tone: 'neutral', kind: 'subs',
    title: `Tus suscripciones: ${eur(subsYear)} al año`,
    body: '¿Las usas todas? Revisarlas de vez en cuando es el ahorro más fácil.',
    href: '/dashboard/suscripciones',
  });

  // 6) Tasa de ahorro del mes (solo cuando ya ha pasado buena parte del mes).
  if (today >= 15 && overview.expectedIncome > 0) {
    const rate = ((overview.expectedIncome - overview.spent) / overview.expectedIncome) * 100;
    if (rate >= 10) list.push({
      id: 'savings', tone: 'good', kind: 'savings',
      title: `Conservas el ${pct(rate)} de tus ingresos`,
      body: `Si sigues así, este mes podrías apartar unos ${eur(Math.max(0, overview.available))}.`,
      href: '/dashboard/presupuestos',
    });
  }

  return list;
}
