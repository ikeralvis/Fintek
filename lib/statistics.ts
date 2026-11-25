/**
 * Estadísticas de un periodo (mes o año) comparado con el periodo anterior equivalente.
 * Funciones puras (sin Supabase ni React) para poder testearlas y reutilizarlas en el PDF.
 */
import {
  eachDayOfInterval, eachMonthOfInterval, endOfMonth, endOfYear, format, getDate, getDay, getDaysInMonth,
  startOfMonth, startOfYear, subMonths, subYears,
} from 'date-fns';
import { es } from 'date-fns/locale';

export type StatTx = {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  transaction_date: string;
  category_id?: string | null;
  description?: string | null;
  account_id?: string | null;
};
export type StatCategory = { id: string; name: string; icon?: string; color?: string };
export type PeriodType = 'month' | 'year';

export type CategoryRow = {
  id: string;
  name: string;
  icon?: string;
  color: string;
  amount: number;
  prevAmount: number;
  /** Variación frente al periodo anterior (null si antes no hubo nada). */
  change: number | null;
  share: number;
  count: number;
  topMerchants: { name: string; amount: number; count: number }[];
};

export type PeriodStats = {
  label: string;
  prevLabel: string;
  start: string;
  end: string;
  income: number;
  expense: number;
  balance: number;
  savingsRate: number;
  prevIncome: number;
  prevExpense: number;
  incomeChange: number | null;
  expenseChange: number | null;
  txCount: number;
  /** Mes: gasto acumulado por día, frente al mes anterior. Año: por meses. */
  series: { label: string; income: number; expense: number; cumExpense: number; prevCumExpense: number | null }[];
  expenseCategories: CategoryRow[];
  incomeCategories: CategoryRow[];
  topMerchants: { name: string; amount: number; count: number; categoryId: string | null }[];
  /** Gasto medio por día de la semana (lunes primero). */
  weekdays: { label: string; amount: number; avg: number }[];
  micro: { total: number; count: number; share: number };
  /** Vista año: tabla por meses. */
  months: { key: string; label: string; income: number; expense: number; balance: number }[];
};

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');
const UNCATEGORIZED = 'uncategorized';
const MICRO_THRESHOLD = 10;

const merchantKey = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

const pctChange = (now: number, prev: number) => (prev > 0 ? (now - prev) / prev : null);

export function periodRange(type: PeriodType, date: Date) {
  const start = type === 'month' ? startOfMonth(date) : startOfYear(date);
  const end = type === 'month' ? endOfMonth(date) : endOfYear(date);
  const prevDate = type === 'month' ? subMonths(date, 1) : subYears(date, 1);
  const prevStart = type === 'month' ? startOfMonth(prevDate) : startOfYear(prevDate);
  const prevEnd = type === 'month' ? endOfMonth(prevDate) : endOfYear(prevDate);
  return { start, end, prevStart, prevEnd };
}

function groupMerchants(txs: StatTx[], limit: number) {
  const map = new Map<string, { name: string; amount: number; count: number; categoryId: string | null }>();
  for (const t of txs) {
    const name = t.description?.trim();
    if (!name) continue;
    const key = merchantKey(name);
    if (!key) continue;
    const m = map.get(key) ?? { name, amount: 0, count: 0, categoryId: t.category_id ?? null };
    m.amount += Number(t.amount);
    m.count += 1;
    map.set(key, m);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount).slice(0, limit);
}

function categoryRows(txs: StatTx[], prevTxs: StatTx[], categories: StatCategory[], total: number): CategoryRow[] {
  const byCat = new Map<string, StatTx[]>();
  for (const t of txs) {
    const id = t.category_id || UNCATEGORIZED;
    byCat.set(id, [...(byCat.get(id) ?? []), t]);
  }
  const prevByCat = new Map<string, number>();
  for (const t of prevTxs) {
    const id = t.category_id || UNCATEGORIZED;
    prevByCat.set(id, (prevByCat.get(id) ?? 0) + Number(t.amount));
  }
  return [...byCat.entries()].map(([id, list]) => {
    const cat = categories.find(c => c.id === id);
    const amount = list.reduce((a, t) => a + Number(t.amount), 0);
    const prevAmount = prevByCat.get(id) ?? 0;
    return {
      id,
      name: cat?.name ?? 'Sin categoría',
      icon: cat?.icon,
      color: cat?.color || '#a1a1aa',
      amount,
      prevAmount,
      change: pctChange(amount, prevAmount),
      share: total > 0 ? amount / total : 0,
      count: list.length,
      topMerchants: groupMerchants(list, 5).map(({ name, amount: a, count }) => ({ name, amount: a, count })),
    };
  }).sort((a, b) => b.amount - a.amount);
}

export function computePeriodStats(transactions: StatTx[], categories: StatCategory[], type: PeriodType, date: Date): PeriodStats {
  const { start, end, prevStart, prevEnd } = periodRange(type, date);
  const s = ymd(start), e = ymd(end), ps = ymd(prevStart), pe = ymd(prevEnd);
  const inRange = (t: StatTx, a: string, b: string) => t.transaction_date >= a && t.transaction_date.slice(0, 10) <= b;
  const cur = transactions.filter(t => inRange(t, s, e));
  const prev = transactions.filter(t => inRange(t, ps, pe));

  const curExp = cur.filter(t => t.type === 'expense');
  const curInc = cur.filter(t => t.type === 'income');
  const prevExp = prev.filter(t => t.type === 'expense');
  const prevInc = prev.filter(t => t.type === 'income');
  const sum = (l: StatTx[]) => l.reduce((a, t) => a + Number(t.amount), 0);
  const income = sum(curInc), expense = sum(curExp);
  const prevIncome = sum(prevInc), prevExpense = sum(prevExp);

  // Serie temporal
  let series: PeriodStats['series'];
  if (type === 'month') {
    const days = eachDayOfInterval({ start, end });
    const prevDays = getDaysInMonth(prevStart);
    const prevPerDay = new Array(prevDays).fill(0);
    for (const t of prevExp) prevPerDay[Number(t.transaction_date.slice(8, 10)) - 1] += Number(t.amount);
    let cum = 0, prevCum = 0;
    const prevCumArr = prevPerDay.map(v => (prevCum += v));
    series = days.map(d => {
      const key = ymd(d);
      const dayInc = curInc.filter(t => t.transaction_date.startsWith(key)).reduce((a, t) => a + Number(t.amount), 0);
      const dayExp = curExp.filter(t => t.transaction_date.startsWith(key)).reduce((a, t) => a + Number(t.amount), 0);
      cum += dayExp;
      const n = getDate(d);
      return { label: String(n), income: dayInc, expense: dayExp, cumExpense: cum, prevCumExpense: n <= prevDays ? prevCumArr[n - 1] : null };
    });
  } else {
    let cum = 0, prevCum = 0;
    series = eachMonthOfInterval({ start, end }).map(m => {
      const key = format(m, 'yyyy-MM');
      const prevKey = format(subYears(m, 1), 'yyyy-MM');
      const mInc = curInc.filter(t => t.transaction_date.startsWith(key)).reduce((a, t) => a + Number(t.amount), 0);
      const mExp = curExp.filter(t => t.transaction_date.startsWith(key)).reduce((a, t) => a + Number(t.amount), 0);
      cum += mExp;
      prevCum += prevExp.filter(t => t.transaction_date.startsWith(prevKey)).reduce((a, t) => a + Number(t.amount), 0);
      return { label: format(m, 'MMM', { locale: es }), income: mInc, expense: mExp, cumExpense: cum, prevCumExpense: prevExp.length ? prevCum : null };
    });
  }

  // Día de la semana (lunes = 0)
  const dayNames = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const weekdayTotals = new Array(7).fill(0);
  const weekdayCounts = new Array(7).fill(0);
  // Días transcurridos del periodo (hasta hoy si es el actual) para sacar la media por día.
  const now = new Date();
  const lastDay = end < now ? end : now;
  if (lastDay >= start) {
    for (const d of eachDayOfInterval({ start, end: lastDay })) weekdayCounts[(getDay(d) + 6) % 7] += 1;
  }
  for (const t of curExp) {
    const d = new Date(`${t.transaction_date.slice(0, 10)}T12:00:00`);
    weekdayTotals[(getDay(d) + 6) % 7] += Number(t.amount);
  }
  const weekdays = dayNames.map((label, i) => ({ label, amount: weekdayTotals[i], avg: weekdayCounts[i] > 0 ? weekdayTotals[i] / weekdayCounts[i] : 0 }));

  const microTxs = curExp.filter(t => Number(t.amount) < MICRO_THRESHOLD);
  const microTotal = sum(microTxs);

  const months = type === 'year'
    ? eachMonthOfInterval({ start, end }).map(m => {
      const key = format(m, 'yyyy-MM');
      const inc = curInc.filter(t => t.transaction_date.startsWith(key)).reduce((a, t) => a + Number(t.amount), 0);
      const exp = curExp.filter(t => t.transaction_date.startsWith(key)).reduce((a, t) => a + Number(t.amount), 0);
      return { key, label: format(m, 'MMMM', { locale: es }), income: inc, expense: exp, balance: inc - exp };
    })
    : [];

  return {
    label: type === 'month' ? format(start, 'MMMM yyyy', { locale: es }) : format(start, 'yyyy'),
    prevLabel: type === 'month' ? format(prevStart, 'MMMM', { locale: es }) : format(prevStart, 'yyyy'),
    start: s,
    end: e,
    income,
    expense,
    balance: income - expense,
    savingsRate: income > 0 ? (income - expense) / income : 0,
    prevIncome,
    prevExpense,
    incomeChange: pctChange(income, prevIncome),
    expenseChange: pctChange(expense, prevExpense),
    txCount: cur.length,
    series,
    expenseCategories: categoryRows(curExp, prevExp, categories, expense),
    incomeCategories: categoryRows(curInc, prevInc, categories, income),
    topMerchants: groupMerchants(curExp, 8),
    weekdays,
    micro: { total: microTotal, count: microTxs.length, share: expense > 0 ? microTotal / expense : 0 },
    months,
  };
}

/** CSV (separador ";" y coma decimal, para Excel en español) de los movimientos del periodo. */
export function periodCsv(transactions: StatTx[], categories: StatCategory[], start: string, end: string): string {
  const rows = transactions
    .filter(t => t.transaction_date >= start && t.transaction_date.slice(0, 10) <= end)
    .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));
  const esc = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const typeLabel = { income: 'Ingreso', expense: 'Gasto', transfer: 'Transferencia' } as const;
  const lines = ['Fecha;Tipo;Categoría;Concepto;Importe'];
  for (const t of rows) {
    const cat = categories.find(c => c.id === t.category_id)?.name ?? '';
    const signedAmount = t.type === 'expense' ? -Number(t.amount) : Number(t.amount);
    lines.push([t.transaction_date.slice(0, 10), typeLabel[t.type], esc(cat), esc(t.description?.trim() ?? ''), signedAmount.toFixed(2).replace('.', ',')].join(';'));
  }
  return lines.join('\n');
}
