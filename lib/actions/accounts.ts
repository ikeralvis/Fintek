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
    // 1. Fetch bank color first
    const { data: bankData, error: bankError } = await supabase
      .from('banks')
      .select('color')
      .eq('id', formData.bankId)
      .single();

    const bankColor = bankData?.color || '#000000';

    // 2. Create account with bank's color
    const { data, error } = await supabase
      .from('accounts')
      .insert([
        {
          user_id: user.id,
          bank_id: formData.bankId,
          name: formData.name,
          initial_balance: formData.initialBalance,
          current_balance: formData.initialBalance,
          color: bankColor, // Snapshot color
        },
      ])
      .select(`
        *,
        banks (
          id,
          name,
          color
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

export async function cancelAccount(accountId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'No autenticado' };
  }

  try {
    // Verificar que la cuenta existe y pertenece al usuario
    const { data: account, error: fetchError } = await supabase
      .from('accounts')
      .select('id, is_active')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !account) {
      return { error: 'Cuenta no encontrada' };
    }

    if (!account.is_active) {
      return { error: 'Esta cuenta ya está cancelada' };
    }

    // Marcar como inactiva (soft delete)
    const { error } = await supabase
      .from('accounts')
      .update({ is_active: false })
      .eq('id', accountId)
      .eq('user_id', user.id);

    if (error) throw error;

    revalidatePath('/dashboard/cuentas');
    return { error: null };
  } catch (err: any) {
    console.error('Error cancelling account:', err);
    return { error: err.message };
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
          name,
          color
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
    // Obtener transacciones del año actual (para el resumen anual de la cuenta si se necesita)
    // O del mes, según lo que requiera la UI. El usuario pidió "Gasto total año / ingreso total año"
    const now = new Date();
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('account_id', accountId)
      .gte('transaction_date', firstDayOfYear);

    if (error) throw error;

    const yearlyIncome = transactions
      ?.filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0) || 0;

    const yearlyExpense = transactions
      ?.filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0) || 0;

    return {
      data: { yearlyIncome, yearlyExpense },
      error: null
    };
  } catch (err: any) {
    console.error('Error fetching account stats:', err);
    return { data: null, error: err.message };
  }
}