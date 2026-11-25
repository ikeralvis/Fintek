import { describe, expect, it } from 'vitest';
import { computeMonthRecap, upcomingWeek } from '@/lib/homeWidgets';
import { goalProgress } from '@/lib/savingsGoals';
import type { HomeSubscription, HomeTx } from '@/lib/homeInsights';

const now = new Date(2026, 10, 25, 12); // miércoles 25 nov 2026

const sub = (over: Partial<HomeSubscription>): HomeSubscription => ({
  id: 's', name: 'Netflix', amount: 10, billing_cycle: 'monthly', next_payment_date: '2026-11-27', status: 'active', type: 'expense', ...over,
});
const tx = (id: string, type: HomeTx['type'], amount: number, date: string, extra: Partial<HomeTx> = {}): HomeTx =>
  ({ id, type, amount, transaction_date: date, ...extra });

describe('upcomingWeek', () => {
  it('devuelve 7 días desde hoy y coloca cada cobro en su día', () => {
    const days = upcomingWeek([sub({})], now);
    expect(days).toHaveLength(7);
    expect(days[0].date).toBe('2026-11-25');
    expect(days.find(d => d.date === '2026-11-27')?.charges).toHaveLength(1);
  });
  it('repite los semanales y muestra hoy los vencidos', () => {
    const days = upcomingWeek([sub({ id: 'w', billing_cycle: 'weekly', next_payment_date: '2026-11-20' })], now);
    expect(days[0].charges).toHaveLength(1); // vencido el 20 → hoy
    expect(days.filter(d => d.charges.length).length).toBe(1); // el siguiente sería el 2 dic, fuera
  });
  it('no suma los ingresos al total del día', () => {
    const days = upcomingWeek([sub({ type: 'income', amount: 1500 })], now);
    expect(days.find(d => d.date === '2026-11-27')?.total).toBe(0);
  });
});

describe('computeMonthRecap', () => {
  it('resume el mes anterior', () => {
    const txs = [
      tx('i', 'income', 2000, '2026-10-01'),
      ...[100, 250, 50, 50].map((a, i) => tx(`e${i}`, 'expense', a, `2026-10-1${i}`, { category_id: i === 1 ? 'casa' : 'ocio' })),
    ];
    const r = computeMonthRecap(txs, now)!;
    expect(r.monthKey).toBe('2026-10');
    expect(r.spent).toBe(450);
    expect(r.balance).toBe(1550);
    expect(r.topCategoryId).toBe('casa');
  });
  it('no se muestra con muy pocos movimientos', () => {
    expect(computeMonthRecap([tx('i', 'income', 2000, '2026-10-01')], now)).toBeNull();
  });
});

describe('goalProgress', () => {
  const pocket = { id: 'p', name: 'Viaje', color: '#000', balance: 1200, target_amount: 2000 };
  it('calcula lo que falta al mes contando el mes actual', () => {
    const g = goalProgress({ ...pocket, target_date: '2027-04-15' }, now)!; // nov..abr = 6 meses
    expect(g.remaining).toBe(800);
    expect(g.perMonth).toBeCloseTo(800 / 6);
  });
  it('sin fecha solo da lo que falta', () => {
    expect(goalProgress(pocket, now)!.perMonth).toBeNull();
  });
  it('marca la fecha pasada y el objetivo cumplido', () => {
    expect(goalProgress({ ...pocket, target_date: '2026-09-01' }, now)!.overdue).toBe(true);
    expect(goalProgress({ ...pocket, balance: 2500 }, now)!.done).toBe(true);
  });
});
