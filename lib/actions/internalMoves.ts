'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { toActionError } from '@/lib/actionError';

const Schema = z.object({
  expenseId: z.string().uuid(),
  incomeId: z.string().uuid().nullable(),
  toAccountId: z.string().uuid().nullable(),
});

/** Convierte un gasto (y su ingreso pareja, si lo hay) en una transferencia. Ver sql/convert_to_transfer.sql. */
export async function convertToTransfer(input: z.input<typeof Schema>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { error: 'Datos no válidos' };

  const { error } = await supabase.rpc('convert_to_transfer', {
    p_expense_id: parsed.data.expenseId,
    p_income_id: parsed.data.incomeId,
    p_to_account_id: parsed.data.toAccountId,
    p_credit_destination: false,
  });
  if (error) {
    if (error.message.includes('convert_to_transfer')) return { error: 'Falta ejecutar sql/convert_to_transfer.sql en Supabase' };
    return { error: toActionError(error, 'transfers') };
  }

  revalidatePath('/dashboard', 'layout');
  return { error: null };
}
