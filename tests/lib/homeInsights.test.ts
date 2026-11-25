import { describe, expect, it } from 'vitest';
import { computeInsights, computeMonthOverview, pendingThisMonth, savingsCategoryIds, type HomeSubscription, type HomeTx } from '@/lib/homeInsights';

const now = new Date(2026, 10, 20, 12); // 20 nov 2026

const tx = (id: string, type: HomeTx['type'], amount: number, date: string, category_id?: string): HomeTx =>
  ({ id, type, amount, transaction_date: date, category_id });

const sub = (over: Partial<HomeSubscription>): HomeSubscription => ({
  id: 's', name: 'Netflix', amount: 10, billing_cycle: 'monthly', next_payment_date: '2026-11-25', status: 'active', type: 'expense', ...over,
});

describe('pendingThisMonth', () => {
  it('cuenta un cobro mensual que cae antes de fin de mes', () => {
    expect(pendingThisMonth(sub({}), now)).toBe(10);
  });
  it('no cuenta lo que cae el mes que viene', () => {
    expect(pendingThisMonth(sub({ next_payment_date: '2026-12-02' }), now)).toBe(0);
  });
  it('cuenta varias ocurrencias semanales', () => {
    expect(pendingThisMonth(sub({ billing_cycle: 'weekly', next_payment_date: '2026-11-21' }), now)).toBe(20); // 21 y 28
  });
  it('ignora los pausados', () => {
    expect(pendingThisMonth(sub({ status: 'paused' }), now)).toBe(0);
  });
});

describe('computeMonthOverview', () => {
  const transactions = [
    tx('1', 'income', 2000, '2026-11-01'),
    tx('2', 'expense', 300, '2026-11-05', 'food'),
    tx('3', 'expense', 200, '2026-11-18', 'fun'),
    tx('4', 'transfer', 100, '2026-11-02', 'savings'),
    tx('5', 'transfer', 999, '2026-11-03'), // traspaso sin categoría: no cuenta
  ];
  // Octubre con datos suficientes (8 días con gasto): 50 €/día del 1 al 8 (=400) y 600 € el 28.
  const prev = [
    ...Array.from({ length: 8 }, (_, i) => tx(`p${i}`, 'expense', 50, `2026-10-0${i + 1}`, 'food')),
    tx('p9', 'expense', 600, '2026-10-28', 'food'),
  ];
  const savings = new Set(['savings']);

  it('resta gastado, ahorrado y fijos pendientes del ingreso', () => {
    const o = computeMonthOverview({ now, transactions, prevMonthTransactions: prev, subscriptions: [sub({})], monthlyIncomeSetting: 0, savingsCategories: savings });
    expect(o.expectedIncome).toBe(2000);
    expect(o.spent).toBe(500);
    expect(o.saved).toBe(100);
    expect(o.pendingFixed).toBe(10);
    expect(o.available).toBe(1390);
    expect(o.daysLeft).toBe(11);
    expect(o.perDay).toBeCloseTo(1390 / 11);
  });

  it('usa el ingreso configurado si es mayor que lo recibido', () => {
    const o = computeMonthOverview({ now, transactions, prevMonthTransactions: prev, subscriptions: [], monthlyIncomeSetting: 2500 });
    expect(o.expectedIncome).toBe(2500);
    expect(o.incomeSource).toBe('settings');
  });

  it('compara el ritmo con el mes pasado a la misma altura', () => {
    const o = computeMonthOverview({ now, transactions, prevMonthTransactions: prev, subscriptions: [], monthlyIncomeSetting: 0 });
    expect(o.hasPrevData).toBe(true);
    expect(o.prevSameDay).toBe(400); // a día 20 de octubre aún no estaba el de 600
    expect(o.paceDiffPct).toBeCloseTo(25); // 500 vs 400
    expect(o.cumulativeThis).toHaveLength(20);
    expect(o.cumulativePrev).toHaveLength(31);
  });
});

describe('ahorro y comparativa', () => {
  it('no cuenta como ahorro un traspaso con una categoría que no es de ahorro', () => {
    const transactions = [tx('1', 'income', 1000, '2026-11-01'), tx('2', 'transfer', 300, '2026-11-03', 'moves'), tx('3', 'transfer', 250, '2026-11-04', 'sav')];
    const cats = savingsCategoryIds([{ id: 'sav', name: 'Ahorro' }, { id: 'moves', name: 'Traspasos' }], []);
    const o = computeMonthOverview({ now, transactions, prevMonthTransactions: [], subscriptions: [], monthlyIncomeSetting: 0, savingsCategories: cats });
    expect(o.saved).toBe(250);
  });
  it('usa los presupuestos de ahorro aunque la categoría no se llame Ahorro', () => {
    expect(savingsCategoryIds([{ id: 'x', name: 'Hucha viaje' }], [{ category_id: 'x', is_savings: true }]).has('x')).toBe(true);
  });
  it('no compara con el mes pasado si casi no hay datos', () => {
    const transactions = [tx('1', 'expense', 900, '2026-11-02')];
    const prev = [tx('p', 'expense', 200, '2026-10-25')];
    const o = computeMonthOverview({ now, transactions, prevMonthTransactions: prev, subscriptions: [], monthlyIncomeSetting: 0 });
    expect(o.hasPrevData).toBe(false);
    expect(o.paceDiffPct).toBeNull();
    expect(o.cumulativePrev).toEqual([]);
  });
  it('calcula cuánto supera el gasto a los ingresos', () => {
    const transactions = [tx('1', 'income', 1594, '2026-11-01'), tx('2', 'expense', 1900, '2026-11-02')];
    const o = computeMonthOverview({ now, transactions, prevMonthTransactions: [], subscriptions: [], monthlyIncomeSetting: 0 });
    expect(o.overspentIncome).toBe(306);
  });
});

describe('computeInsights', () => {
  it('detecta una categoría que sube respecto al mes pasado', () => {
    const transactions = [tx('1', 'income', 2000, '2026-11-01'), tx('2', 'expense', 120, '2026-11-04', 'food')];
    const prev = [
      tx('p1', 'expense', 50, '2026-10-04', 'food'),
      ...Array.from({ length: 8 }, (_, i) => tx(`o${i}`, 'expense', 20, `2026-10-1${i}`, 'other')),
    ];
    const categories = [{ id: 'food', name: 'Restaurantes' }];
    const overview = computeMonthOverview({ now, transactions, prevMonthTransactions: prev, subscriptions: [], monthlyIncomeSetting: 0 });
    const list = computeInsights({ now, transactions, prevMonthTransactions: prev, categories, subscriptions: [], overview });
    const up = list.find(i => i.kind === 'up');
    expect(up?.title).toContain('Restaurantes');
    expect(list.some(i => i.kind === 'streak')).toBe(true); // sin gastos desde el día 4
  });
});

describe('insight de ritmo', () => {
  const prev = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, type: 'expense' as const, amount: 20, transaction_date: `2026-10-${String(i + 1).padStart(2, '0')}` }));
  const run = (spentNow: number) => {
    const transactions = [{ id: 'n', type: 'expense' as const, amount: spentNow, transaction_date: '2026-11-03' }];
    const overview = computeMonthOverview({ now, transactions, prevMonthTransactions: prev, subscriptions: [], monthlyIncomeSetting: 0 });
    return computeInsights({ now, transactions, prevMonthTransactions: prev, categories: [], subscriptions: [], overview }).find(i => i.kind === 'pace');
  };
  it('aparece con una diferencia creíble', () => {
    expect(run(260)?.title).toBe('Gastas un 30 % más que el mes pasado'); // 260 vs 200
  });
  it('no aparece con diferencias desorbitadas (mes pasado incompleto)', () => {
    expect(run(902)).toBeUndefined(); // +351 %
  });
});
