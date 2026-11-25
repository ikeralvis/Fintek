/**
 * Inversiones: rendimiento real descontando aportaciones, y sincronización de aportaciones a
 * partir de transferencias. Funciones puras (sin Supabase ni React) para poder testearlas.
 *
 * Conceptos:
 * - Valor apuntado: lo que el usuario anota del bróker cada día (snapshots).
 * - Aportación pendiente: dinero que ya ha llegado a la cuenta pero el bróker aún no ha
 *   invertido. Se suma al valor apuntado ("valor ajustado") para que esos días no cuenten como
 *   pérdida ni el día de la compra como ganancia.
 * - Ganancia del día = Δ valor ajustado − aportaciones netas de ese tramo.
 * - Rentabilidad de un periodo = ponderada por tiempo (TWR): encadena las rentabilidades
 *   diarias, así que meter o sacar dinero no la infla ni la hunde.
 */
import { differenceInCalendarDays, format, parseISO } from 'date-fns';

export type InvAccount = {
  id: string;
  name: string;
  current_balance: number;
  /** TOTAL aportado (lo mantiene el usuario; las transferencias posteriores al checkpoint lo suben solas). */
  contributed_capital: number;
  /**
   * Fecha hasta la que contributed_capital ya incluye las transferencias. Las aportaciones de
   * transferencias hasta esa fecha solo ponen fecha a ese dinero; las posteriores lo suman.
   */
  contributions_checkpoint?: string | null;
  banks?: { name: string; color: string; logo_url?: string } | null;
};

export type InvSnapshot = { id: string; account_id: string; value: number; snapshot_date: string };

export type InvContribution = {
  id: string;
  account_id: string;
  amount: number;
  contribution_date: string;
  /**
   * manual: aportación que subió el capital aportado. transfer: creada desde una transferencia.
   * backfill: pone fecha a dinero que ya estaba en el capital (no lo cambia).
   */
  source?: 'manual' | 'transfer' | 'backfill' | null;
  transaction_id?: string | null;
  status?: 'pending' | 'invested' | null;
  invested_date?: string | null;
};

const isPendingAt = (c: InvContribution, date: string) =>
  c.contribution_date <= date &&
  (c.status === 'pending' || (c.status === 'invested' && !!c.invested_date && c.invested_date > date));

/** Dinero aportado que a esa fecha aún no estaba invertido (se suma al valor apuntado). */
export function pendingAt(contributions: InvContribution[], accountId: string, date: string): number {
  return contributions
    .filter(c => c.account_id === accountId && Number(c.amount) > 0 && isPendingAt(c, date))
    .reduce((a, c) => a + Number(c.amount), 0);
}

/**
 * Total aportado a una cuenta: siempre contributed_capital. Las aportaciones (de cualquier
 * origen) no se suman encima: solo dicen CUÁNDO entró cada parte de ese total.
 */
export function contributedTotal(account: InvAccount, _contributions?: InvContribution[]): number {
  return Number(account.contributed_capital || 0);
}

/** Aportado a una fecha: base sin fecha (lo de antes de registrar nada) + aportaciones hasta esa fecha. */
function contributedAt(account: InvAccount, contributions: InvContribution[], date: string): number {
  const mine = contributions.filter(c => c.account_id === account.id);
  const baseline = Number(account.contributed_capital || 0) - mine.reduce((a, c) => a + Number(c.amount), 0);
  return baseline + mine.filter(c => c.contribution_date <= date).reduce((a, c) => a + Number(c.amount), 0);
}

const flowsIn = (contributions: InvContribution[], accountId: string, fromExclusive: string, toInclusive: string) =>
  contributions
    .filter(c => c.account_id === accountId && c.contribution_date > fromExclusive && c.contribution_date <= toInclusive)
    .reduce((a, c) => a + Number(c.amount), 0);

export type SeriesPoint = {
  date: string;
  /** Valor ajustado total (solo cuentas que ya tienen algún registro). */
  total: number;
  contributed: number;
  perAccount: Record<string, number | undefined>;
};

export type DailyGain = {
  date: string;
  prevDate: string;
  gain: number;
  /** Rentabilidad del tramo (gain / base). */
  ret: number;
  flows: number;
  perAccount: Record<string, { gain: number; ret: number }>;
};

export function buildSeries(accounts: InvAccount[], snapshots: InvSnapshot[], contributions: InvContribution[]) {
  const byAcc = new Map<string, InvSnapshot[]>();
  for (const s of snapshots) byAcc.set(s.account_id, [...(byAcc.get(s.account_id) ?? []), s]);
  for (const list of byAcc.values()) list.sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));

  const dates = [...new Set(snapshots.map(s => s.snapshot_date))].sort();
  const cursor = new Map<string, number>();
  const series: SeriesPoint[] = dates.map(date => {
    const perAccount: Record<string, number | undefined> = {};
    let total = 0;
    let contributed = 0;
    for (const acc of accounts) {
      const list = byAcc.get(acc.id) ?? [];
      let i = cursor.get(acc.id) ?? -1;
      while (i + 1 < list.length && list[i + 1].snapshot_date <= date) i++;
      cursor.set(acc.id, i);
      if (i >= 0) {
        const v = Number(list[i].value) + pendingAt(contributions, acc.id, date);
        perAccount[acc.id] = v;
        total += v;
        contributed += contributedAt(acc, contributions, date);
      }
    }
    return { date, total, contributed, perAccount };
  });

  const daily: DailyGain[] = [];
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1];
    const cur = series[i];
    let gain = 0;
    let base = 0;
    let flows = 0;
    const perAccount: DailyGain['perAccount'] = {};
    for (const acc of accounts) {
      const a = prev.perAccount[acc.id];
      const b = cur.perAccount[acc.id];
      if (a === undefined || b === undefined) continue; // la cuenta aún no se registraba
      const f = flowsIn(contributions, acc.id, prev.date, cur.date);
      const g = b - a - f;
      const accBase = a + Math.max(0, f);
      perAccount[acc.id] = { gain: g, ret: accBase > 0 ? g / accBase : 0 };
      gain += g;
      base += accBase;
      flows += f;
    }
    daily.push({ date: cur.date, prevDate: prev.date, gain, ret: base > 0 ? gain / base : 0, flows, perAccount });
  }
  return { series, daily };
}

export type PeriodStats = {
  gain: number;
  /** Rentabilidad ponderada por tiempo del periodo (0.05 = 5 %). */
  twr: number;
  days: number;
  best: DailyGain | null;
  worst: DailyGain | null;
  positiveDays: number;
};

/** Estadísticas de los tramos cuyo día final es posterior a `fromExclusive` (null = todo). */
export function periodStats(daily: DailyGain[], fromExclusive: string | null, accountId?: string): PeriodStats {
  const list = daily.filter(d => !fromExclusive || d.date > fromExclusive);
  let gain = 0;
  let growth = 1;
  let best: DailyGain | null = null;
  let worst: DailyGain | null = null;
  let positiveDays = 0;
  for (const d of list) {
    const g = accountId ? d.perAccount[accountId]?.gain : d.gain;
    const r = accountId ? d.perAccount[accountId]?.ret : d.ret;
    if (g === undefined || r === undefined) continue;
    gain += g;
    growth *= 1 + r;
    if (g > 0) positiveDays++;
    if (!accountId) {
      if (!best || d.gain > best.gain) best = d;
      if (!worst || d.gain < worst.gain) worst = d;
    }
  }
  return { gain, twr: growth - 1, days: list.length, best, worst, positiveDays };
}

export type MonthReturn = { month: string; gain: number; twr: number };

export function monthlyReturns(daily: DailyGain[]): MonthReturn[] {
  const map = new Map<string, { gain: number; growth: number }>();
  for (const d of daily) {
    const key = d.date.slice(0, 7);
    const m = map.get(key) ?? { gain: 0, growth: 1 };
    m.gain += d.gain;
    m.growth *= 1 + d.ret;
    map.set(key, m);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, m]) => ({ month, gain: m.gain, twr: m.growth - 1 }));
}

// ---------------------------------------------------------------------------------------------
// Sincronización: transferencias → aportaciones
// ---------------------------------------------------------------------------------------------

export type InvTransfer = { id: string; account_id: string; related_account_id: string | null; amount: number; transaction_date: string };

export type SyncPlan = {
  inserts: Omit<InvContribution, 'id'>[];
  links: { contributionId: string; transactionId: string }[];
  updates: { id: string; amount: number }[];
  deletes: string[];
  /** Cuánto sumar/restar a contributed_capital por cuenta (solo movimientos posteriores al checkpoint). */
  capitalDeltas: Record<string, number>;
};

/** Días tras los que una aportación nueva se da por invertida (para transferencias antiguas). */
const PENDING_WINDOW_DAYS = 10;
/** Margen de fechas para reconocer una aportación manual como la misma transferencia. */
const MATCH_WINDOW_DAYS = 10;

/**
 * Qué cambiar para que cada transferencia a/desde una cuenta de inversión tenga su aportación:
 * - Si ya existe (enlazada), se actualiza el importe si cambió.
 * - Si hay una aportación manual o fechada equivalente (misma cuenta e importe, ±10 días), se
 *   enlaza en vez de duplicarla.
 * - Si no, se crea.
 * - Las aportaciones automáticas cuya transferencia ya no existe se borran.
 * El capital total solo se toca por movimientos posteriores al checkpoint de la cuenta (los
 * anteriores ya están dentro del capital que puso el usuario). Sin checkpoint, todo lo suma.
 */
export function planContributionSync({
  accounts, transfers, contributions, today,
}: {
  accounts: Pick<InvAccount, 'id' | 'contributions_checkpoint'>[];
  transfers: InvTransfer[];
  contributions: InvContribution[];
  today: string;
}): SyncPlan {
  const checkpoint = new Map(accounts.map(a => [a.id, a.contributions_checkpoint ?? null]));
  const plan: SyncPlan = { inserts: [], links: [], updates: [], deletes: [], capitalDeltas: {} };
  const addCapital = (accountId: string, date: string, amount: number) => {
    const cp = checkpoint.get(accountId);
    if (cp && date <= cp) return;
    plan.capitalDeltas[accountId] = (plan.capitalDeltas[accountId] ?? 0) + amount;
  };

  const legs: { tx: InvTransfer; accountId: string; amount: number }[] = [];
  for (const t of transfers) {
    if (t.related_account_id && checkpoint.has(t.related_account_id)) legs.push({ tx: t, accountId: t.related_account_id, amount: Number(t.amount) });
    if (checkpoint.has(t.account_id)) legs.push({ tx: t, accountId: t.account_id, amount: -Number(t.amount) });
  }

  const linked = new Map(contributions.filter(c => c.transaction_id).map(c => [`${c.transaction_id}:${c.account_id}`, c]));
  const free = contributions.filter(c => c.source !== 'transfer' && !c.transaction_id);
  const used = new Set<string>();

  const legKeys = new Set<string>();
  for (const leg of legs) {
    const key = `${leg.tx.id}:${leg.accountId}`;
    legKeys.add(key);
    const existing = linked.get(key);
    if (existing) {
      const diff = leg.amount - Number(existing.amount);
      if (existing.source === 'transfer' && Math.abs(diff) > 0.005) {
        plan.updates.push({ id: existing.id, amount: leg.amount });
        addCapital(leg.accountId, leg.tx.transaction_date, diff);
      }
      continue;
    }
    const match = free.find(c =>
      !used.has(c.id) &&
      c.account_id === leg.accountId &&
      Math.abs(Number(c.amount) - leg.amount) < 0.01 &&
      Math.abs(differenceInCalendarDays(parseISO(c.contribution_date), parseISO(leg.tx.transaction_date))) <= MATCH_WINDOW_DAYS
    );
    if (match) {
      used.add(match.id);
      plan.links.push({ contributionId: match.id, transactionId: leg.tx.id });
      continue;
    }
    const age = differenceInCalendarDays(parseISO(today), parseISO(leg.tx.transaction_date));
    const pending = leg.amount > 0 && age <= PENDING_WINDOW_DAYS;
    plan.inserts.push({
      account_id: leg.accountId,
      amount: leg.amount,
      contribution_date: leg.tx.transaction_date,
      source: 'transfer',
      transaction_id: leg.tx.id,
      status: pending ? 'pending' : 'invested',
      invested_date: pending ? null : leg.tx.transaction_date,
    });
    addCapital(leg.accountId, leg.tx.transaction_date, leg.amount);
  }

  for (const c of contributions) {
    if (c.source !== 'transfer') continue;
    if (!c.transaction_id || !legKeys.has(`${c.transaction_id}:${c.account_id}`)) {
      plan.deletes.push(c.id);
      addCapital(c.account_id, c.contribution_date, -Number(c.amount));
    }
  }
  return plan;
}

// ---------------------------------------------------------------------------------------------
// Aportaciones sin fecha
// ---------------------------------------------------------------------------------------------

export type JumpCandidate = {
  accountId: string;
  date: string;
  prevDate: string;
  /** Subida del valor en ese tramo que no explica ninguna aportación registrada. */
  jump: number;
  /** Importe redondo más probable (lo que seguramente aportaste). */
  suggested: number;
};

export type UndatedReport = {
  accountId: string;
  /** Capital aportado que no tiene fecha y no estaba ya en el primer registro. */
  undated: number;
  candidates: JumpCandidate[];
};

/** Importe "redondo" más cercano: de 50 en 50 desde 50 €, de 10 en 10 por debajo. */
export function roundContribution(jump: number): number {
  const step = jump >= 45 ? 50 : 10;
  return Math.max(step, Math.round(jump / step) * step);
}

/**
 * Por cuenta: cuánto del capital aportado no tiene fecha (capital − aportaciones fechadas −
 * valor del primer registro) y qué saltos del historial parecen esas aportaciones. Un salto es
 * candidato si sube más de lo que suele moverse el mercado en un día (≥ 2 % y ≥ 5 €, o ≥ 1,5 %
 * y ≥ 40 €) y no hay ninguna aportación registrada a ±3 días.
 */
export function findUndatedContributions(
  accounts: InvAccount[],
  snapshots: InvSnapshot[],
  contributions: InvContribution[],
): UndatedReport[] {
  const reports: UndatedReport[] = [];
  for (const acc of accounts) {
    const snaps = snapshots.filter(s => s.account_id === acc.id).sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
    if (snaps.length === 0) continue;
    const mine = contributions.filter(c => c.account_id === acc.id);
    const datedInCapital = mine.reduce((a, c) => a + Number(c.amount), 0);
    const first = snaps[0];
    // Lo aportado con fecha antes del primer registro ya está dentro de su valor.
    const undated = Number(acc.contributed_capital || 0) - datedInCapital - Number(first.value)
      + mine.filter(c => c.contribution_date <= first.snapshot_date).reduce((a, c) => a + Number(c.amount), 0);

    const candidates: JumpCandidate[] = [];
    for (let i = 1; i < snaps.length; i++) {
      const prev = snaps[i - 1];
      const cur = snaps[i];
      const flows = flowsIn(contributions, acc.id, prev.snapshot_date, cur.snapshot_date);
      const jump = Number(cur.value) - Number(prev.value) - flows;
      const rel = Number(prev.value) > 0 ? jump / Number(prev.value) : 1;
      const big = (rel >= 0.02 && jump >= 5) || (rel >= 0.015 && jump >= 40);
      if (!big) continue;
      const nearby = mine.some(c => Math.abs(differenceInCalendarDays(parseISO(c.contribution_date), parseISO(cur.snapshot_date))) <= 3);
      if (nearby) continue;
      candidates.push({ accountId: acc.id, date: cur.snapshot_date, prevDate: prev.snapshot_date, jump, suggested: roundContribution(jump) });
    }
    if (undated > 1 || candidates.length > 0) reports.push({ accountId: acc.id, undated: Math.max(0, undated), candidates });
  }
  return reports;
}

export const ymd = (d: Date) => format(d, 'yyyy-MM-dd');
