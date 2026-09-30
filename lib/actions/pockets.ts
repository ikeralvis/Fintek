'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const CreateSchema = z.object({
  accountId: z.string().uuid(),
  name: z.string().trim().min(1, 'Pon un nombre').max(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  targetAmount: z.number().positive().nullable(),
});

const MoveSchema = z.object({
  pocketId: z.string().uuid(),
  amount: z.number().refine(n => n !== 0, 'Importe inválido'),
  note: z.string().max(200).optional(),
});

function revalidate(accountId: string) {
  revalidatePath(`/dashboard/cuentas/${accountId}`);
  revalidatePath(`/dashboard/cuentas/${accountId}/apartados`);
}

export async function createPocket(input: z.input<typeof CreateSchema>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues.map(i => i.message).join(', ') };

  const { error } = await supabase.from('account_pockets').insert({
    user_id: user.id,
    account_id: parsed.data.accountId,
    name: parsed.data.name,
    color: parsed.data.color,
    target_amount: parsed.data.targetAmount,
  });
  if (error) return { error: error.message };

  revalidate(parsed.data.accountId);
  return { error: null };
}

/** amount > 0 añade dinero al apartado, amount < 0 lo retira (no toca el saldo de la cuenta). */
export async function movePocketMoney(accountId: string, input: z.input<typeof MoveSchema>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const parsed = MoveSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues.map(i => i.message).join(', ') };

  const { error } = await supabase.rpc('pocket_move', {
    p_pocket_id: parsed.data.pocketId,
    p_amount: parsed.data.amount,
    p_note: parsed.data.note ?? null,
  });
  if (error) return { error: error.message };

  revalidate(accountId);
  return { error: null };
}

/** Elimina el apartado: su dinero vuelve a estar disponible en la cuenta. */
export async function deletePocket(accountId: string, pocketId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const { error } = await supabase.from('account_pockets').delete().eq('id', pocketId).eq('user_id', user.id);
  if (error) return { error: error.message };

  revalidate(accountId);
  return { error: null };
}
