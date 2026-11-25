'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { toActionError } from '@/lib/actionError';

// Las transferencias se ejecutan en funciones SQL (sql/2026-11_security_hardening.sql) que,
// dentro de una única transacción, bloquean las cuentas, comprueban que son del usuario,
// validan el saldo y ajustan ambos saldos de forma relativa. Así dos operaciones simultáneas
// o un fallo a mitad no pueden dejar los saldos descuadrados.

const TransferSchema = z.object({
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  categoryId: z.string().uuid().optional().nullable(),
  amount: z.number().positive(),
  description: z.string().max(500).optional(),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
});

type TransferInput = {
  fromAccountId: string;
  toAccountId: string;
  categoryId?: string | null;
  amount: number;
  description?: string;
  transactionDate: string;
};

function validate(formData: TransferInput) {
  const validation = TransferSchema.safeParse(formData);
  if (!validation.success) {
    return { error: 'Datos inválidos: ' + validation.error.issues.map(e => e.message).join(', ') };
  }
  if (validation.data.fromAccountId === validation.data.toAccountId) {
    return { error: 'No puedes transferir a la misma cuenta' };
  }
  return { data: validation.data };
}

function revalidateTransferViews() {
  revalidatePath('/dashboard/transacciones');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/cuentas');
}

export async function createTransfer(formData: TransferInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const v = validate(formData);
  if (!v.data) return { error: v.error };

  try {
    const { data: transactionId, error } = await supabase.rpc('create_transfer', {
      p_from_account_id: v.data.fromAccountId,
      p_to_account_id: v.data.toAccountId,
      p_amount: v.data.amount,
      p_transaction_date: v.data.transactionDate,
      p_description: v.data.description || 'Transferencia',
      p_category_id: v.data.categoryId || null,
    });
    if (error) throw error;

    revalidateTransferViews();
    return { data: { id: transactionId as string }, error: null };
  } catch (err) {
    return { error: toActionError(err, 'createTransfer'), data: null };
  }
}

export async function updateTransfer(transactionId: string, formData: TransferInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  if (!z.string().uuid().safeParse(transactionId).success) return { error: 'Transferencia no válida' };
  const v = validate(formData);
  if (!v.data) return { error: v.error };

  try {
    const { error } = await supabase.rpc('update_transfer', {
      p_transaction_id: transactionId,
      p_from_account_id: v.data.fromAccountId,
      p_to_account_id: v.data.toAccountId,
      p_amount: v.data.amount,
      p_transaction_date: v.data.transactionDate,
      p_description: v.data.description || 'Transferencia',
      p_category_id: v.data.categoryId || null,
    });
    if (error) throw error;

    revalidateTransferViews();
    return { error: null };
  } catch (err) {
    return { error: toActionError(err, 'updateTransfer') };
  }
}

export async function deleteTransfer(transactionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  if (!z.string().uuid().safeParse(transactionId).success) return { error: 'Transferencia no válida' };

  try {
    const { error } = await supabase.rpc('delete_transfer', { p_transaction_id: transactionId });
    if (error) throw error;

    revalidateTransferViews();
    return { error: null };
  } catch (err) {
    return { error: toActionError(err, 'deleteTransfer') };
  }
}
