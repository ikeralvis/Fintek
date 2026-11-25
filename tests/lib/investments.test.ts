import { describe, expect, it } from 'vitest';
import {
  buildSeries, contributedTotal, monthlyReturns, pendingAt, periodStats, planContributionSync,
  type InvAccount, type InvContribution, type InvSnapshot,
} from '@/lib/investments';

const acc = (id: string, contributed = 1000): InvAccount => ({ id, name: id, current_balance: 0, contributed_capital: contributed });
const snap = (account_id: string, snapshot_date: string, value: number): InvSnapshot => ({ id: `${account_id}-${snapshot_date}`, account_id, value, snapshot_date });
const contrib = (over: Partial<InvContribution>): InvContribution => ({
  id: 'c', account_id: 'a', amount: 100, contribution_date: '2026-11-03', source: 'transfer', status: 'invested', ...over,
});

describe('rendimiento', () => {
  it('una aportación no cuenta como ganancia', () => {
    const { daily } = buildSeries(
      [acc('a')],
      [snap('a', '2026-11-01', 1000), snap('a', '2026-11-02', 1010), snap('a', '2026-11-03', 1110)],
      [contrib({ contribution_date: '2026-11-03', invested_date: '2026-11-03' })],
    );
    expect(daily.map(d => Math.round(d.gain))).toEqual([10, 0]);
  });

  it('la aportación pendiente no parece pérdida ni la compra ganancia', () => {
    // El 3 llegan 100 € pero el bróker sigue en 1010; el 5 ya los ha invertido (1112).
    const contributions = [contrib({ contribution_date: '2026-11-03', status: 'invested', invested_date: '2026-11-05' })];
    const { series, daily } = buildSeries(
      [acc('a')],
      [snap('a', '2026-11-02', 1010), snap('a', '2026-11-03', 1010), snap('a', '2026-11-04', 1011), snap('a', '2026-11-05', 1112)],
      contributions,
    );
    expect(pendingAt(contributions, 'a', '2026-11-04')).toBe(100);
    expect(series[1].total).toBe(1110);
    expect(daily.map(d => Math.round(d.gain))).toEqual([0, 1, 1]);
  });

  it('la rentabilidad del periodo no se infla al aportar', () => {
    const { daily } = buildSeries(
      [acc('a')],
      [snap('a', '2026-11-01', 1000), snap('a', '2026-11-02', 1100), snap('a', '2026-11-03', 3200)],
      [contrib({ amount: 2000, contribution_date: '2026-11-03', invested_date: '2026-11-03' })],
    );
    const stats = periodStats(daily, null);
    expect(stats.gain).toBe(200);
    // +10 % el día 2, y el día 3: +100 sobre 1100+2000 → ≈ 3,2 %
    expect(stats.twr).toBeCloseTo(1.1 * (1 + 100 / 3100) - 1, 6);
  });

  it('una cuenta que empieza a registrarse más tarde no suma su saldo como ganancia', () => {
    const { daily } = buildSeries(
      [acc('a'), acc('b')],
      [snap('a', '2026-11-01', 1000), snap('a', '2026-11-02', 1005), snap('b', '2026-11-02', 5000)],
      [],
    );
    expect(daily[0].gain).toBe(5);
  });

  it('agrupa por meses', () => {
    const { daily } = buildSeries([acc('a')], [snap('a', '2026-10-30', 1000), snap('a', '2026-10-31', 1010), snap('a', '2026-11-01', 1000)], []);
    const months = monthlyReturns(daily);
    expect(months.map(m => [m.month, Math.round(m.gain)])).toEqual([['2026-10', 10], ['2026-11', -10]]);
  });

  it('el total aportado es siempre el capital (las aportaciones solo lo fechan)', () => {
    expect(contributedTotal(acc('a', 1000), [contrib({ amount: 100 }), contrib({ id: 'm', amount: 50, source: 'manual' })])).toBe(1000);
  });
});

describe('planContributionSync', () => {
  // Checkpoint = hasta cuándo el capital que puso el usuario ya incluye las transferencias.
  const accounts = [{ id: 'inv', contributions_checkpoint: '2026-11-25' }];
  const today = '2026-11-25';
  const tx = (id: string, date: string, amount = 100, to: string | null = 'inv', from = 'bank') =>
    ({ id, account_id: from, related_account_id: to, amount, transaction_date: date });

  it('fecha las transferencias pasadas sin tocar el capital (ya estaban incluidas)', () => {
    const plan = planContributionSync({ accounts, today, transfers: [tx('t1', '2026-03-22'), tx('t2', '2026-11-22')], contributions: [] });
    expect(plan.inserts.map(i => [i.transaction_id, i.status])).toEqual([['t1', 'invested'], ['t2', 'pending']]);
    expect(plan.capitalDeltas).toEqual({});
  });

  it('las transferencias posteriores al checkpoint suben el capital solas', () => {
    const plan = planContributionSync({ accounts, today: '2026-12-03', transfers: [tx('t1', '2026-12-01')], contributions: [] });
    expect(plan.capitalDeltas).toEqual({ inv: 100 });
  });

  it('sin checkpoint todo suma al capital (cuenta nueva)', () => {
    const plan = planContributionSync({ accounts: [{ id: 'inv', contributions_checkpoint: null }], today, transfers: [tx('t1', '2026-11-01')], contributions: [] });
    expect(plan.capitalDeltas).toEqual({ inv: 100 });
  });

  it('las retiradas son negativas', () => {
    const plan = planContributionSync({ accounts, today, transfers: [tx('t2', '2026-11-24', 50, 'bank', 'inv')], contributions: [] });
    expect(plan.inserts[0]).toMatchObject({ amount: -50, status: 'invested' });
  });

  it('enlaza una aportación manual equivalente en vez de duplicarla', () => {
    const manual = contrib({ id: 'm1', account_id: 'inv', source: 'manual', contribution_date: '2026-11-22' });
    const plan = planContributionSync({ accounts, today, transfers: [tx('t1', '2026-11-20')], contributions: [manual] });
    expect(plan.links).toEqual([{ contributionId: 'm1', transactionId: 't1' }]);
    expect(plan.inserts).toHaveLength(0);
  });

  it('una vez enlazadas, la siguiente sincronización no vuelve a crear nada', () => {
    const linked = [
      contrib({ id: 'm1', account_id: 'inv', source: 'manual', transaction_id: 't1', contribution_date: '2026-09-22' }),
      contrib({ id: 'a1', account_id: 'inv', source: 'transfer', transaction_id: 't0', contribution_date: '2026-03-22' }),
    ];
    const plan = planContributionSync({ accounts, today, transfers: [tx('t0', '2026-03-22'), tx('t1', '2026-09-22')], contributions: linked });
    expect(plan).toEqual({ inserts: [], links: [], updates: [], deletes: [], capitalDeltas: {} });
  });

  it('actualiza importes cambiados y borra las de transferencias eliminadas', () => {
    const linked = contrib({ id: 'a1', account_id: 'inv', transaction_id: 't1', amount: 100, contribution_date: '2026-11-20' });
    const orphan = contrib({ id: 'a2', account_id: 'inv', transaction_id: 'gone' });
    const plan = planContributionSync({ accounts, today, transfers: [tx('t1', '2026-11-20', 120)], contributions: [linked, orphan] });
    expect(plan.updates).toEqual([{ id: 'a1', amount: 120 }]);
    expect(plan.deletes).toEqual(['a2']);
    expect(plan.capitalDeltas).toEqual({}); // ambas anteriores al checkpoint
  });
});

import { findUndatedContributions, roundContribution } from '@/lib/investments';

describe('aportaciones sin fecha', () => {
  it('redondea a importes típicos', () => {
    expect(roundContribution(118)).toBe(100);
    expect(roundContribution(104)).toBe(100);
    expect(roundContribution(52)).toBe(50);
    expect(roundContribution(11)).toBe(10);
  });

  it('calcula lo aportado sin fecha y propone los saltos', () => {
    // Abre con 2000, mete 100 el 10 (apuntado) y 100 el 20 y el 25 (sin apuntar). Capital = 2300.
    const account = acc('a', 2300);
    const snaps = [
      snap('a', '2026-06-01', 2000), snap('a', '2026-06-02', 2004),
      snap('a', '2026-06-10', 2106), snap('a', '2026-06-11', 2100),
      snap('a', '2026-06-20', 2203), snap('a', '2026-06-25', 2305),
    ];
    const logged = [contrib({ id: 'm', account_id: 'a', source: 'manual', amount: 100, contribution_date: '2026-06-10' })];
    const [report] = findUndatedContributions([account], snaps, logged);
    expect(report.undated).toBe(200);
    expect(report.candidates.map(c => [c.date, c.suggested])).toEqual([['2026-06-20', 100], ['2026-06-25', 100]]);
  });

  it('al fechar una aportación ya no cuenta como ganancia ni cambia el capital total', () => {
    const account = acc('a', 2100);
    const snaps = [snap('a', '2026-06-01', 2000), snap('a', '2026-06-20', 2103)];
    const backfill = contrib({ id: 'b', account_id: 'a', source: 'backfill', amount: 100, contribution_date: '2026-06-20' });
    expect(buildSeries([account], snaps, [backfill]).daily[0].gain).toBe(3);
    expect(contributedTotal(account, [backfill])).toBe(2100);
    expect(findUndatedContributions([account], snaps, [backfill])).toEqual([]);
  });
});
