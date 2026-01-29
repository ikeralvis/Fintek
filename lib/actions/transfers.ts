'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const TransferSchema = z.object({
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string().optional(),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
});

export async function createTransfer(formData: {
  fromAccountId: string;
  toAccountId: string;
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

  // Validate input
  const validation = TransferSchema.safeParse(formData);
  if (!validation.success) {
    return { error: 'Datos inválidos: ' + validation.error.issues.map(e => e.message).join(', ') };
  }

  // Verify accounts are different
  if (formData.fromAccountId === formData.toAccountId) {
    return { error: 'No puedes transferir a la misma cuenta' };
  }

  try {
    // Get both accounts to verify ownership and balances
    const { data: accounts, error: fetchError } = await supabase
      .from('accounts')
      .select('id, user_id, current_balance')
      .in('id', [formData.fromAccountId, formData.toAccountId]);

    if (fetchError) throw fetchError;

    // Verify both accounts belong to user
    if (
      !accounts ||
      accounts.length !== 2 ||
      !accounts.every(acc => acc.user_id === user.id)
    ) {
      return { error: 'Una o ambas cuentas no existen o no son tuyas' };
    }

    const fromAccount = accounts.find(acc => acc.id === formData.fromAccountId);
    const toAccount = accounts.find(acc => acc.id === formData.toAccountId);

    if (!fromAccount || !toAccount) {
      return { error: 'No se encontraron las cuentas' };
    }

    // Check sufficient balance
    if (fromAccount.current_balance < formData.amount) {
      return { error: 'Saldo insuficiente en la cuenta de origen' };
    }

    // Create transfer transaction record
    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert([
        {
          user_id: user.id,
          type: 'transfer',
          account_id: formData.fromAccountId,
          related_account_id: formData.toAccountId,
          amount: formData.amount,
          description: formData.description || 'Transferencia',
          transaction_date: formData.transactionDate,
          category_id: null,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Update both account balances
    // Note: The trigger won't affect these because type is 'transfer'
    const newFromBalance = fromAccount.current_balance - formData.amount;
    const newToBalance = toAccount.current_balance + formData.amount;

    const { error: updateError } = await supabase
      .from('accounts')
      .update({ current_balance: newFromBalance, updated_at: new Date().toISOString() })
      .eq('id', formData.fromAccountId);

    if (updateError) throw updateError;

    const { error: updateError2 } = await supabase
      .from('accounts')
      .update({ current_balance: newToBalance, updated_at: new Date().toISOString() })
      .eq('id', formData.toAccountId);

    if (updateError2) throw updateError2;

    revalidatePath('/dashboard/transacciones');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/cuentas');

    return { data: transaction, error: null };
  } catch (err: any) {
    console.error('Error creating transfer:', err);
    return { error: err.message, data: null };
  }
}

export async function deleteTransfer(transactionId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'No autenticado' };
  }

  try {
    // Get transfer details
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('type, amount, account_id, related_account_id')
      .eq('id', transactionId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) throw fetchError;

    if (transaction.type !== 'transfer') {
      return { error: 'Esta transacción no es una transferencia' };
    }

    // Delete the transfer transaction
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId)
      .eq('user_id', user.id);

    if (deleteError) throw deleteError;

    // Revert balance changes
    const { data: fromAccount } = await supabase
      .from('accounts')
      .select('current_balance')
      .eq('id', transaction.account_id)
      .single();

    const { data: toAccount } = await supabase
      .from('accounts')
      .select('current_balance')
      .eq('id', transaction.related_account_id)
      .single();

    if (fromAccount && toAccount) {
      // Revert: add back to source, remove from destination
      await supabase
        .from('accounts')
        .update({ current_balance: fromAccount.current_balance + transaction.amount })
        .eq('id', transaction.account_id);

      await supabase
        .from('accounts')
        .update({ current_balance: toAccount.current_balance - transaction.amount })
        .eq('id', transaction.related_account_id);
    }

    revalidatePath('/dashboard/transacciones');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/cuentas');

    return { error: null };
  } catch (err: any) {
    console.error('Error deleting transfer:', err);
    return { error: err.message };
  }
}
