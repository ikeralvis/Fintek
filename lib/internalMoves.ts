/**
 * Detecta movimientos entre cuentas propias registrados como gasto/ingreso en vez de como
 * transferencia. Inflan a la vez los gastos y los ingresos de Estadísticas (y Presupuestos).
 */
import { differenceInCalendarDays, parseISO } from 'date-fns';

export type MoveTx = {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  transaction_date: string;
  account_id?: string | null;
  category_id?: string | null;
  description?: string | null;
};

export type MovePair = { expense: MoveTx; income: MoveTx };
export type LoneMove = { expense: MoveTx; reason: 'category' | 'description' };

/** Conceptos típicos de un traspaso entre cuentas propias. */
const TRANSFER_WORDS = /(aportaci|traspas|transferenc|ahorro|fondo|inversi|hucha|broker|bróker)/i;
const PAIR_WINDOW_DAYS = 2;

export function findInternalMoves(transactions: MoveTx[], dismissed: Set<string> = new Set()) {
  const expenses = transactions.filter(t => t.type === 'expense' && !dismissed.has(t.id));
  const incomes = transactions.filter(t => t.type === 'income' && !dismissed.has(t.id));

  // 1) Parejas: mismo importe, cuentas distintas, ±2 días (se empareja con el más cercano).
  const pairs: MovePair[] = [];
  const usedIncome = new Set<string>();
  const paired = new Set<string>();
  for (const e of [...expenses].sort((a, b) => a.transaction_date.localeCompare(b.transaction_date))) {
    let best: MoveTx | null = null;
    let bestDist = Infinity;
    for (const i of incomes) {
      if (usedIncome.has(i.id) || !e.account_id || !i.account_id || i.account_id === e.account_id) continue;
      if (Math.abs(Number(i.amount) - Number(e.amount)) > 0.005) continue;
      const dist = Math.abs(differenceInCalendarDays(parseISO(i.transaction_date.slice(0, 10)), parseISO(e.transaction_date.slice(0, 10))));
      if (dist <= PAIR_WINDOW_DAYS && dist < bestDist) { best = i; bestDist = dist; }
    }
    if (best) {
      usedIncome.add(best.id);
      paired.add(e.id);
      pairs.push({ expense: e, income: best });
    }
  }

  // 2) Gastos sueltos que parecen traspasos: su categoría se usa en transferencias o en las
  //    parejas de arriba, o el concepto suena a aportación/ahorro.
  const transferCategories = new Set(
    transactions.filter(t => t.type === 'transfer' && t.category_id).map(t => t.category_id!)
  );
  for (const p of pairs) if (p.expense.category_id) transferCategories.add(p.expense.category_id);

  const lone: LoneMove[] = [];
  for (const e of expenses) {
    if (paired.has(e.id)) continue;
    if (e.category_id && transferCategories.has(e.category_id)) lone.push({ expense: e, reason: 'category' });
    else if (e.description && TRANSFER_WORDS.test(e.description)) lone.push({ expense: e, reason: 'description' });
  }

  return {
    pairs: pairs.sort((a, b) => b.expense.transaction_date.localeCompare(a.expense.transaction_date)),
    lone: lone.sort((a, b) => b.expense.transaction_date.localeCompare(a.expense.transaction_date)),
    /** Cuánto inflan gastos (e ingresos, en las parejas) estos movimientos. */
    inflated: pairs.reduce((a, p) => a + Number(p.expense.amount), 0) + lone.reduce((a, l) => a + Number(l.expense.amount), 0),
  };
}
