import { describe, expect, it } from 'vitest';
import { computeBudgetMonth, type PlanBudget, type PlanTx } from '@/lib/budgetPlan';

const now = new Date(2026, 10, 20, 12); // 20 nov 2026 → quedan 11 días
const cats = [
  { id: 'food', name: 'Supermercado' },
  { id: 'fun', name: 'Restaurantes' },
  { id: 'sav', name: 'Ahorro' },
  { id: 'other', name: 'Otros' },
];
const tx = (id: string, type: PlanTx['type'], amount: number, date: string, category_id?: string): PlanTx =>
  ({ id, type, amount, transaction_date: date, category_id });
const budget = (category_id: string, amount: number, is_savings = false): PlanBudget => ({ id: `b-${category_id}`, category_id, amount, is_savings });

const base = {
  now,
  categories: cats,
  savingsCategories: new Set(['sav']),
  settings: { monthly_income: 2000, cushion: 100, savings_target: 300 },
};

describe('computeBudgetMonth', () => {
  it('calcula lo que queda: ingreso − ahorro − margen − gastado', () => {
    const m = computeBudgetMonth({
      ...base,
      budgets: [budget('food', 400), budget('fun', 200)],
      transactions: [tx('1', 'expense', 300, '2026-11-05', 'food'), tx('2', 'expense', 100, '2026-11-06', 'other'), tx('3', 'transfer', 300, '2026-11-01', 'sav')],
    });
    expect(m.toAssign).toBe(1600);
    expect(m.assigned).toBe(600);
    expect(m.unassigned).toBe(1000);
    expect(m.spent).toBe(400);
    expect(m.saved).toBe(300);
    expect(m.remaining).toBe(1200);
    expect(m.state).toBe('ok');
    expect(m.unbudgetedSpent).toBe(100);
    expect(m.alerts.some(a => a.id === 'savings-ok')).toBe(true);
  });

  it('distingue entre tirar del margen y pasarse del todo', () => {
    const margin = computeBudgetMonth({ ...base, budgets: [], transactions: [tx('1', 'expense', 1650, '2026-11-02')] });
    expect(margin.state).toBe('margin');
    expect(margin.cushionUsed).toBe(50);
    const over = computeBudgetMonth({ ...base, budgets: [], transactions: [tx('1', 'expense', 1800, '2026-11-02')] });
    expect(over.state).toBe('over');
    expect(over.alerts[0].title).toContain('100,00');
  });

  it('marca categorías al límite, pasadas y con mala proyección', () => {
    const m = computeBudgetMonth({
      ...base,
      budgets: [budget('food', 100), budget('fun', 100), budget('other', 300)],
      transactions: [
        tx('1', 'expense', 120, '2026-11-03', 'food'), // pasada
        tx('2', 'expense', 90, '2026-11-04', 'fun'), // 90 %
        tx('3', 'expense', 250, '2026-11-10', 'other'), // 83 %: proyección 375 > 330
      ],
    });
    const ids = m.alerts.map(a => a.id);
    expect(ids).toContain('ex-food');
    expect(ids).toContain('wa-fun');
    expect(ids).toContain('pr-other');
    expect(m.rows[0].category.id).toBe('food'); // ordenadas por % usado
    expect(m.rows.find(r => r.category.id === 'other')!.perDay).toBeCloseTo(50 / 11);
  });

  it('avisa si se reparte más de lo disponible', () => {
    const m = computeBudgetMonth({ ...base, budgets: [budget('food', 1700)], transactions: [] });
    expect(m.alerts.some(a => a.id === 'unassigned')).toBe(true);
  });

  it('sin ahorro configurado usa la suma de presupuestos de ahorro', () => {
    const m = computeBudgetMonth({
      ...base,
      settings: { monthly_income: 2000, cushion: 0, savings_target: 0 },
      budgets: [budget('sav', 250, true)],
      transactions: [],
    });
    expect(m.savingsTarget).toBe(250);
  });
});
