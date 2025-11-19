'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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

  try {
      // Obtener el saldo actual ANTES de insertar la transacción para
      // calcular el saldo esperado (esto evita confusión con el trigger
      // que actualiza el saldo en la base de datos inmediatamente después
      // del INSERT).
      const { data: accountBefore } = await supabase
        .from('accounts')
        .select('current_balance')
        .eq('id', formData.accountId)
        .single();

      const beforeBalance = accountBefore?.current_balance ?? null;
      const expectedNewBalance = beforeBalance === null
        ? null
        : (formData.type === 'income' ? beforeBalance + formData.amount : beforeBalance - formData.amount);

      console.log('Balance before insert:', beforeBalance);
      console.log('Expected balance after insert:', expectedNewBalance);

      // Insertar transacción (el trigger en la BD ajustará el saldo)
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

      // Leer el saldo DESPUÉS de la inserción para confirmar lo que hizo el trigger
      const { data: accountAfter } = await supabase
        .from('accounts')
        .select('current_balance')
        .eq('id', formData.accountId)
        .single();

      console.log('Balance after insert (DB):', accountAfter?.current_balance);

      // Nota: La base de datos tiene un trigger (`update_account_balance`) que
      // actualiza el saldo de la cuenta cuando se inserta una transacción.
      // Para evitar que el saldo se actualice doblemente (desde el trigger
      // y desde la aplicación), no realizamos la actualización aquí.
      console.log('Skipping application-level account update because DB trigger handles it');

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
    // Obtener datos de la transacción antes de eliminarla
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('type, amount, account_id')
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

    // Revertir el saldo de la cuenta
    const { data: account } = await supabase
      .from('accounts')
      .select('current_balance')
      .eq('id', transaction.account_id)
      .single();

    if (account) {
      // Nota: La base de datos tiene un trigger (`update_account_balance`)
      // que ya ajusta el saldo cuando se eliminan transacciones. Para evitar
      // aplicar la reversión dos veces (trigger + aplicación), no actualizamos
      // `current_balance` aquí desde la aplicación.
      console.log('Skipping application-level account update on delete; DB trigger handles it');
    }

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
  type?: 'income' | 'expense';
  accountId?: string;
  categoryId?: string;
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

    const { data, error } = await query;

    if (error) throw error;

    return { data, error: null };
  } catch (err: any) {
    console.error('Error fetching transactions:', err);
    return { data: null, error: err.message };
  }
}