'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createAccount(formData: {
  bankId: string;
  name: string;
  initialBalance: number;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'No autenticado' };
  }

  try {
    const { data, error } = await supabase
      .from('accounts')
      .insert([
        {
          user_id: user.id,
          bank_id: formData.bankId,
          name: formData.name,
          initial_balance: formData.initialBalance,
          current_balance: formData.initialBalance,
        },
      ])
      .select(`
        *,
        banks (
          id,
          name
        )
      `)
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/cuentas');
    return { data, error: null };
  } catch (err: any) {
    console.error('Error creating account:', err);
    return { error: err.message, data: null };
  }
}

export async function deleteAccount(accountId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'No autenticado' };
  }

  try {
    // Verificar si la cuenta tiene transacciones
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('id')
      .eq('account_id', accountId)
      .limit(1);

    if (transError) throw transError;

    if (transactions && transactions.length > 0) {
      return { 
        error: 'No se puede eliminar una cuenta con transacciones. Elimina primero las transacciones asociadas.' 
      };
    }

    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', accountId)
      .eq('user_id', user.id);

    if (error) throw error;

    revalidatePath('/dashboard/cuentas');
    return { error: null };
  } catch (err: any) {
    console.error('Error deleting account:', err);
    return { error: err.message };
  }
}

export async function getAccounts() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'No autenticado' };
  }

  try {
    const { data, error } = await supabase
      .from('accounts')
      .select(`
        *,
        banks (
          id,
          name
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data, error: null };
  } catch (err: any) {
    console.error('Error fetching accounts:', err);
    return { data: null, error: err.message };
  }
}

export async function getAccountStats(accountId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'No autenticado' };
  }

  try {
    // Obtener transacciones del mes actual
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('account_id', accountId)
      .gte('transaction_date', firstDayOfMonth);

    if (error) throw error;

    const monthlyIncome = transactions
      ?.filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0) || 0;

    const monthlyExpense = transactions
      ?.filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0) || 0;

    return { 
      data: { monthlyIncome, monthlyExpense }, 
      error: null 
    };
  } catch (err: any) {
    console.error('Error fetching account stats:', err);
    return { data: null, error: err.message };
  }
}