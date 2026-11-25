import { differenceInCalendarMonths, format, parseISO, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

export type GoalPocket = {
  id: string;
  name: string;
  color: string;
  balance: number;
  target_amount: number | null;
  target_date?: string | null;
  account_id?: string;
};

export type GoalProgress = {
  pct: number;
  remaining: number;
  done: boolean;
  /** Cuánto apartar cada mes para llegar a la fecha (null sin fecha o si ya está cumplido). */
  perMonth: number | null;
  /** La fecha ya pasó sin llegar al objetivo. */
  overdue: boolean;
  /** "jul 2027" */
  dateLabel: string | null;
};

/**
 * Progreso de un apartado con objetivo. Los meses se cuentan incluyendo el actual: si la fecha
 * es dentro de este mes, hay que apartarlo todo ya (perMonth = remaining).
 */
export function goalProgress(p: GoalPocket, now = new Date()): GoalProgress | null {
  const target = Number(p.target_amount);
  if (!target || target <= 0) return null;
  const balance = Number(p.balance);
  const remaining = Math.max(0, target - balance);
  const done = remaining === 0;
  const pct = Math.min(100, (balance / target) * 100);

  let perMonth: number | null = null;
  let overdue = false;
  let dateLabel: string | null = null;
  if (p.target_date) {
    const date = parseISO(p.target_date);
    dateLabel = format(date, 'MMM yyyy', { locale: es });
    const months = differenceInCalendarMonths(date, startOfDay(now)) + 1;
    if (!done) {
      if (months <= 0) overdue = true;
      else perMonth = remaining / months;
    }
  }
  return { pct, remaining, done, perMonth, overdue, dateLabel };
}
