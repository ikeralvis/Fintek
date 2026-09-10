'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const TransactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string().optional(),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
});

export async function createTransaction(formData: {
  type: 'income' | 'expense';
  accountId: string;
  categoryId: string;
  amount: number;
  description?: string;
  transactionDate: string;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'No autenticado' };
  }

  // Validate input with Zod
  const validation = TransactionSchema.safeParse(formData);
  if (!validation.success) {
    return { error: 'Datos inválidos: ' + validation.error.issues.map(e => e.message).join(', ') };
  }

  try {
    // Insertar transacción (el trigger en la BD ajusta el saldo automáticamente)
    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert([
        {
          user_id: user.id,
          type: formData.type,
          account_id: formData.accountId,
          category_id: formData.categoryId,
          amount: formData.amount,
          description: formData.description || null,
          transaction_date: formData.transactionDate,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/transacciones');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/cuentas');

    return { data: transaction, error: null };
  } catch (err: any) {
    console.error('Error creating transaction:', err);
    return { error: err.message, data: null };
  }
}

export async function deleteTransaction(transactionId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'No autenticado' };
  }

  try {
    // Confirmar que la transacción existe y pertenece al usuario antes de eliminarla
    const { error: fetchError } = await supabase
      .from('transactions')
      .select('id')
      .eq('id', transactionId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) throw fetchError;

    // Eliminar la transacción
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId)
      .eq('user_id', user.id);

    if (deleteError) throw deleteError;

    // Nota: la base de datos tiene un trigger (`update_account_balance`) que
    // ya revierte el saldo de la cuenta al eliminar la transacción.

    revalidatePath('/dashboard/transacciones');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/cuentas');

    return { error: null };
  } catch (err: any) {
    console.error('Error deleting transaction:', err);
    return { error: err.message };
  }
}

export async function getTransactions(filters?: {
  type?: 'income' | 'expense' | 'transfer';
  accountId?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  includeTransfers?: boolean;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'No autenticado' };
  }

  try {
    let query = supabase
      .from('transactions')
      .select(`
        *,
        accounts (
          id,
          name,
          banks (
            id,
            name
          )
        ),
        categories (
          id,
          name
        )
      `)
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (filters?.type) {
      query = query.eq('type', filters.type);
    }
    if (filters?.accountId) {
      query = query.eq('account_id', filters.accountId);
    }
    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }
    if (filters?.dateFrom) {
      query = query.gte('transaction_date', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('transaction_date', filters.dateTo);
    }
    // By default, exclude transfers from analysis (income/expense view)
    if (filters?.includeTransfers !== true && !filters?.type) {
      query = query.not('type', 'eq', 'transfer');
    }

    const { data, error } = await query;

    if (error) throw error;

    return { data, error: null };
  } catch (err: any) {
    console.error('Error fetching transactions:', err);
    return { data: null, error: err.message };
  }
}

/**
 * Get transaction summary stats (income, expense, net)
 * Excludes transfers from calculations
 */
export async function getTransactionStats(filters?: {
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'No autenticado' };
  }

  try {
    let query = supabase
      .from('transactions')
      .select('type, amount')
      .eq('user_id', user.id)
      .not('type', 'eq', 'transfer'); // Exclude transfers from stats

    if (filters?.accountId) {
      query = query.eq('account_id', filters.accountId);
    }
    if (filters?.dateFrom) {
      query = query.gte('transaction_date', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('transaction_date', filters.dateTo);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Calculate totals
    const stats = {
      totalIncome: 0,
      totalExpense: 0,
      net: 0,
    };

    if (data) {
      data.forEach((tx: any) => {
        if (tx.type === 'income') {
          stats.totalIncome += tx.amount;
        } else if (tx.type === 'expense') {
          stats.totalExpense += tx.amount;
        }
      });
      stats.net = stats.totalIncome - stats.totalExpense;
    }

    return { data: stats, error: null };
  } catch (err: any) {
    console.error('Error fetching transaction stats:', err);
    return { data: null, error: err.message };
  }
}