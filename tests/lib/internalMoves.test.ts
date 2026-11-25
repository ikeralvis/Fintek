import { describe, expect, it } from 'vitest';
import { findInternalMoves, type MoveTx } from '@/lib/internalMoves';

const tx = (id: string, type: MoveTx['type'], amount: number, date: string, account_id: string, category_id?: string, description?: string): MoveTx =>
  ({ id, type, amount, transaction_date: date, account_id, category_id, description });

describe('findInternalMoves', () => {
  const data = [
    tx('e1', 'expense', 50, '2026-02-05', 'joven', 'aport', 'Aportacion mensual'),
    tx('i1', 'income', 50, '2026-02-05', 'ahorro', 'aport', 'Aportacion mensual'),
    tx('e2', 'expense', 100, '2026-02-22', 'joven', 'otra', 'fondo'),
    tx('e3', 'expense', 100, '2026-01-20', 'joven', 'aport', 'Aportacion mensual'),
    tx('t1', 'transfer', 100, '2026-01-05', 'joven', 'aport'),
    tx('e4', 'expense', 60, '2026-02-10', 'joven', 'food', 'Mercadona'),
    tx('i2', 'income', 60, '2026-02-10', 'joven', 'pay', 'Bizum'), // misma cuenta: no es traspaso
  ];

  it('empareja gasto + ingreso del mismo importe en cuentas distintas', () => {
    const r = findInternalMoves(data);
    expect(r.pairs.map(p => [p.expense.id, p.income.id])).toEqual([['e1', 'i1']]);
  });

  it('marca gastos sueltos por categoría de traspaso o por concepto', () => {
    const r = findInternalMoves(data);
    expect(r.lone.map(l => [l.expense.id, l.reason])).toEqual([['e2', 'description'], ['e3', 'category']]);
    expect(r.inflated).toBe(250);
  });

  it('respeta los descartados', () => {
    const r = findInternalMoves(data, new Set(['e2', 'e1']));
    expect(r.pairs).toHaveLength(0);
    expect(r.lone.map(l => l.expense.id)).toEqual(['e3']);
  });
});
