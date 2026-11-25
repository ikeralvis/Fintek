import { describe, expect, it } from 'vitest';
import { computePeriodStats, periodCsv, type StatTx } from '@/lib/statistics';

const tx = (id: string, type: StatTx['type'], amount: number, date: string, category_id?: string, description?: string): StatTx =>
  ({ id, type, amount, transaction_date: date, category_id, description });
const cats = [{ id: 'food', name: 'Supermercado' }, { id: 'fun', name: 'Ocio' }, { id: 'pay', name: 'Nómina' }];

const data = [
  tx('1', 'income', 2000, '2026-10-01', 'pay'),
  tx('2', 'expense', 100, '2026-10-05', 'food', 'Mercadona'),
  tx('3', 'expense', 50, '2026-10-20', 'fun', 'Cine'),
  tx('4', 'income', 2000, '2026-11-01', 'pay'),
  tx('5', 'expense', 150, '2026-11-02', 'food', 'Mercadona'),
  tx('6', 'expense', 30, '2026-11-03', 'food', 'MERCADONA'),
  tx('7', 'expense', 5, '2026-11-04', 'fun', 'Café'),
  tx('8', 'transfer', 500, '2026-11-05'),
];

describe('computePeriodStats', () => {
  const m = computePeriodStats(data, cats, 'month', new Date(2026, 10, 15));

  it('totales y variación frente al mes anterior', () => {
    expect(m.income).toBe(2000);
    expect(m.expense).toBe(185);
    expect(m.balance).toBe(1815);
    expect(m.expenseChange).toBeCloseTo(185 / 150 - 1);
    expect(m.incomeChange).toBe(0);
    expect(m.txCount).toBe(5); // incluye la transferencia en el recuento, no en los importes
  });

  it('categorías con variación y comercios agrupados', () => {
    const food = m.expenseCategories[0];
    expect(food.id).toBe('food');
    expect(food.amount).toBe(180);
    expect(food.change).toBeCloseTo(0.8);
    expect(food.topMerchants).toEqual([{ name: 'Mercadona', amount: 180, count: 2 }]);
    expect(m.incomeCategories[0].name).toBe('Nómina');
  });

  it('serie acumulada con el mes anterior', () => {
    expect(m.series).toHaveLength(30);
    expect(m.series[3].cumExpense).toBe(185);
    expect(m.series[19].prevCumExpense).toBe(150);
  });

  it('gasto hormiga y comercios', () => {
    expect(m.micro).toMatchObject({ total: 5, count: 1 });
    expect(m.topMerchants[0]).toMatchObject({ name: 'Mercadona', amount: 180 });
  });

  it('vista año: tabla por meses', () => {
    const y = computePeriodStats(data, cats, 'year', new Date(2026, 10, 15));
    expect(y.months).toHaveLength(12);
    expect(y.months[10]).toMatchObject({ income: 2000, expense: 185 });
    expect(y.expenseChange).toBeNull(); // sin datos de 2025
  });
});

describe('periodCsv', () => {
  it('exporta el periodo con importes en formato español', () => {
    const csv = periodCsv(data, cats, '2026-11-01', '2026-11-30').split('\n');
    expect(csv[0]).toBe('Fecha;Tipo;Categoría;Concepto;Importe');
    expect(csv[2]).toBe('2026-11-02;Gasto;Supermercado;Mercadona;-150,00');
    expect(csv).toHaveLength(6);
  });
});
