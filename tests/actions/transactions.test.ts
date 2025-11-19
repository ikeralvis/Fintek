// tests/actions/transactions.test.ts
import { vi, describe, it, expect } from 'vitest';

// Mockear createClient para devolver un supabase stub
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => {
    const mock = {
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
      from: (table: string) => {
        return {
          insert: (rows: any[]) => ({ select: () => ({ single: async () => ({ data: rows[0], error: null }) }) }),
          select: (cols?: string) => ({ eq: (_: string, __: any) => ({ single: async () => ({ data: { current_balance: 100 } }) }) }),
          update: () => ({ eq: () => ({}) }),
        };
      },
    };
    return mock;
  }),
}));

import { createTransaction } from '@/lib/actions/transactions';

describe('createTransaction', () => {
  it('inserta transacción sin lanzar', async () => {
    const res = await createTransaction({
      type: 'expense',
      accountId: 'acc-1',
      categoryId: 'cat-1',
      amount: 10,
      description: 'test',
      transactionDate: '2025-11-19',
    } as any);
    expect(res.error).toBeNull();
    expect(res.data).toBeTruthy();
  });
});