/**
 * Presupuestos: el mes como un plan.
 *   ingreso − ahorro previsto − margen de seguridad = para repartir entre categorías
 *   ingreso − ahorro previsto − margen − gastado     = te quedan para gastar
 * Funciones puras (sin Supabase ni React) para poder testearlas.
 */
import { format, getDate, getDaysInMonth } from 'date-fns';

export type PlanTx = {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  transaction_date: string;
  category_id?: string | null;
  description?: string | null;
};
export type PlanBudget = { id: string; category_id: string; amount: number; is_savings: boolean };
export type PlanCategory = { id: string; name: string; icon?: string; color?: string };
export type PlanSettings = { monthly_income: number; cushion: number; savings_target?: number | null };

export type CategoryStatus = 'ok' | 'warning' | 'exceeded';

export type CategoryRow = {
  budgetId: string;
  category: PlanCategory;
  budget: number;
  spent: number;
  pct: number;
  remaining: number;
  /** Lo que se puede gastar por día hasta fin de mes sin pasarse (0 si ya no queda). */
  perDay: number;
  /** Gasto estimado a fin de mes al ritmo actual. */
  projected: number;
  status: CategoryStatus;
  txs: PlanTx[];
};

export type PlanAlert = {
  id: string;
  tone: 'danger' | 'warning' | 'info' | 'good';
  title: string;
  body?: string;
  categoryId?: string;
};

export type BudgetMonth = {
  income: number;
  savingsTarget: number;
  cushion: number;
  /** ingreso − ahorro − margen: lo que hay para repartir en categorías. */
  toAssign: number;
  assigned: number;
  unassigned: number;
  spent: number;
  saved: number;
  /** ingreso − ahorro − margen − gastado. Negativo = se está tirando del margen (o más). */
  remaining: number;
  /** Parte del margen consumida (0..cushion). */
  cushionUsed: number;
  state: 'ok' | 'margin' | 'over';
  perDay: number;
  daysLeft: number;
  /** Fracción del mes transcurrida (0..1), para el marcador de "dónde deberías ir". */
  monthProgress: number;
  rows: CategoryRow[];
  /** Gasto del mes en categorías sin presupuesto. */
  unbudgetedSpent: number;
  alerts: PlanAlert[];
};

const eur = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

export function computeBudgetMonth({
  now, transactions, budgets, categories, settings, savingsCategories,
}: {
  now: Date;
  transactions: PlanTx[];
  budgets: PlanBudget[];
  categories: PlanCategory[];
  settings: PlanSettings | null;
  /** Categorías cuyo movimiento cuenta como ahorro (ver savingsCategoryIds). */
  savingsCategories: Set<string>;
}): BudgetMonth {
  const monthPrefix = format(now, 'yyyy-MM');
  const monthTx = transactions.filter(t => t.transaction_date.startsWith(monthPrefix));
  const today = getDate(now);
  const daysInMonth = getDaysInMonth(now);
  const daysLeft = daysInMonth - today + 1;
  const monthProgress = today / daysInMonth;

  const income = Number(settings?.monthly_income) || 0;
  const cushion = Number(settings?.cushion) || 0;
  const savingsBudgetsTotal = budgets.filter(b => b.is_savings).reduce((a, b) => a + Number(b.amount), 0);
  const savingsTarget = Number(settings?.savings_target) > 0 ? Number(settings!.savings_target) : savingsBudgetsTotal;
  const toAssign = income - savingsTarget - cushion;

  const spent = monthTx.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0);
  const saved = monthTx
    .filter(t => (t.type === 'transfer' || t.type === 'expense') && t.category_id && savingsCategories.has(t.category_id))
    .reduce((a, t) => a + Number(t.amount), 0);

  // Movimientos que cuentan para el presupuesto de cada categoría: gastos y transferencias con
  // categoría (p. ej. el alquiler pagado por transferencia), salvo las de ahorro.
  const byCat = new Map<string, PlanTx[]>();
  for (const t of monthTx) {
    if (!t.category_id || savingsCategories.has(t.category_id)) continue;
    if (t.type !== 'expense' && t.type !== 'transfer') continue;
    byCat.set(t.category_id, [...(byCat.get(t.category_id) ?? []), t]);
  }

  const catById = new Map(categories.map(c => [c.id, c]));
  const expenseBudgets = budgets.filter(b => !b.is_savings && catById.has(b.category_id) && Number(b.amount) > 0);
  const rows: CategoryRow[] = expenseBudgets.map(b => {
    const txs = (byCat.get(b.category_id) ?? []).sort((x, y) => y.transaction_date.localeCompare(x.transaction_date));
    const catSpent = txs.reduce((a, t) => a + Number(t.amount), 0);
    const budget = Number(b.amount);
    const pct = (catSpent / budget) * 100;
    const remaining = budget - catSpent;
    const status: CategoryStatus = pct > 100 ? 'exceeded' : pct >= 85 ? 'warning' : 'ok';
    return {
      budgetId: b.id,
      category: catById.get(b.category_id)!,
      budget,
      spent: catSpent,
      pct,
      remaining,
      perDay: remaining > 0 ? remaining / daysLeft : 0,
      projected: today > 0 ? (catSpent / today) * daysInMonth : catSpent,
      status,
      txs,
    };
  }).sort((a, b) => b.pct - a.pct);

  const budgetedIds = new Set(expenseBudgets.map(b => b.category_id));
  const unbudgetedSpent = monthTx
    .filter(t => t.type === 'expense' && !(t.category_id && budgetedIds.has(t.category_id)))
    .reduce((a, t) => a + Number(t.amount), 0);

  const assigned = expenseBudgets.reduce((a, b) => a + Number(b.amount), 0);
  const unassigned = toAssign - assigned;
  const remaining = income - savingsTarget - cushion - spent;
  const cushionUsed = remaining < 0 ? Math.min(cushion, -remaining) : 0;
  const state: BudgetMonth['state'] = remaining >= 0 ? 'ok' : -remaining <= cushion ? 'margin' : 'over';
  const perDay = remaining > 0 ? remaining / daysLeft : 0;

  // ------------------------------------------------------------------- avisos
  const alerts: PlanAlert[] = [];
  if (income > 0) {
    if (state === 'over') alerts.push({
      id: 'over', tone: 'danger',
      title: `Te has pasado del plan en ${eur(-remaining - cushion)}`,
      body: 'Ya has gastado tu margen de seguridad entero. Frena el gasto o recorta el ahorro de este mes.',
    });
    else if (state === 'margin') alerts.push({
      id: 'margin', tone: 'warning',
      title: `Estás usando tu margen: ${eur(cushionUsed)} de ${eur(cushion)}`,
      body: 'Lo previsto para gastar ya se ha acabado; a partir de aquí tiras del colchón.',
    });
    if (unassigned < 0) alerts.push({
      id: 'unassigned', tone: 'warning',
      title: `Has repartido ${eur(-unassigned)} más de lo que tienes`,
      body: 'La suma de categorías supera ingreso − ahorro − margen. Ajusta el plan.',
    });
  }
  for (const r of rows) {
    if (r.status === 'exceeded') alerts.push({
      id: `ex-${r.category.id}`, tone: 'danger', categoryId: r.category.id,
      title: `${r.category.name}: te has pasado ${eur(-r.remaining)}`,
    });
    else if (r.status === 'warning') alerts.push({
      id: `wa-${r.category.id}`, tone: 'warning', categoryId: r.category.id,
      title: `${r.category.name}: al ${Math.round(r.pct)} %`,
      body: `Te quedan ${eur(r.remaining)} para ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'}.`,
    });
    // Proyección: solo con algo de mes recorrido y si aún no está pasado ni al límite.
    else if (today >= 7 && daysLeft > 3 && r.projected > r.budget * 1.1) alerts.push({
      id: `pr-${r.category.id}`, tone: 'info', categoryId: r.category.id,
      title: `${r.category.name}: a este ritmo te pasarás ${eur(r.projected - r.budget)}`,
      body: `Para cumplir, no más de ${eur(r.perDay)} al día.`,
    });
  }
  if (savingsTarget > 0 && today >= 20 && saved < savingsTarget) alerts.push({
    id: 'savings', tone: 'info',
    title: `Te faltan ${eur(savingsTarget - saved)} para tu ahorro del mes`,
  });
  if (savingsTarget > 0 && saved >= savingsTarget) alerts.push({
    id: 'savings-ok', tone: 'good', title: '¡Ahorro del mes conseguido!',
  });

  return {
    income, savingsTarget, cushion, toAssign, assigned, unassigned, spent, saved, remaining, cushionUsed, state,
    perDay, daysLeft, monthProgress, rows, unbudgetedSpent, alerts,
  };
}
