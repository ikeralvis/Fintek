'use server';

import { revalidatePath } from 'next/cache';
import { format } from 'date-fns';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { toActionError } from '@/lib/actionError';
import { planContributionSync, type InvContribution, type InvTransfer } from '@/lib/investments';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Crea/actualiza/borra las aportaciones que vienen de transferencias a o desde las cuentas de
 * inversión (incluidas las de pagos automáticos). Se ejecuta al abrir Inversiones. Si aún no se
 * ha aplicado sql/investment_contributions_v2.sql, no hace nada (la página sigue funcionando).
 */
export async function syncInvestmentContributions(): Promise<{ changed: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { changed: false, error: 'No autenticado' };

  // select('*'): contributions_checkpoint puede no existir (sql/investment_capital_checkpoint.sql).
  const { data: accounts } = await supabase
    .from('accounts').select('*').eq('user_id', user.id).eq('is_active', true).eq('type', 'investment');
  const today = format(new Date(), 'yyyy-MM-dd');
  const invAccounts = (accounts || []).map(a => ({
    id: a.id as string,
    contributed_capital: Number(a.contributed_capital) || 0,
    // Sin la columna, se toma hoy: nada de lo ya ocurrido cambia el capital (lo más prudente).
    contributions_checkpoint: (a.contributions_checkpoint === undefined ? today : a.contributions_checkpoint) as string | null,
  }));
  const ids = invAccounts.map(a => a.id);
  if (ids.length === 0) return { changed: false };

  const idList = ids.join(',');
  const [txRes, contribRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('id, account_id, related_account_id, amount, transaction_date')
      .eq('user_id', user.id)
      .eq('type', 'transfer')
      .or(`account_id.in.(${idList}),related_account_id.in.(${idList})`),
    supabase
      .from('investment_contributions')
      .select('id, account_id, amount, contribution_date, source, transaction_id, status, invested_date')
      .eq('user_id', user.id),
  ]);
  // Sin las columnas nuevas (SQL no aplicado) la consulta falla: no se sincroniza nada.
  if (txRes.error || contribRes.error) return { changed: false };

  const plan = planContributionSync({
    accounts: invAccounts,
    transfers: (txRes.data || []) as InvTransfer[],
    contributions: (contribRes.data || []) as InvContribution[],
    today,
  });

  try {
    if (plan.inserts.length) {
      const { error } = await supabase.from('investment_contributions').insert(plan.inserts.map(c => ({ ...c, user_id: user.id })));
      if (error) throw error;
    }
    for (const l of plan.links) {
      const { error } = await supabase.from('investment_contributions').update({ transaction_id: l.transactionId }).eq('id', l.contributionId).eq('user_id', user.id);
      if (error) throw error;
    }
    for (const u of plan.updates) {
      const { error } = await supabase.from('investment_contributions').update({ amount: u.amount }).eq('id', u.id).eq('user_id', user.id);
      if (error) throw error;
    }
    if (plan.deletes.length) {
      const { error } = await supabase.from('investment_contributions').delete().in('id', plan.deletes).eq('user_id', user.id);
      if (error) throw error;
    }
    // Transferencias posteriores al checkpoint: suben (o bajan) el capital total solas.
    for (const [accountId, delta] of Object.entries(plan.capitalDeltas)) {
      if (Math.abs(delta) < 0.005) continue;
      const acc = invAccounts.find(a => a.id === accountId);
      if (!acc) continue;
      const { error } = await supabase.from('accounts')
        .update({ contributed_capital: Math.round((acc.contributed_capital + delta) * 100) / 100 })
        .eq('id', accountId).eq('user_id', user.id);
      if (error) throw error;
    }
  } catch (err) {
    return { changed: false, error: toActionError(err, 'investments') };
  }

  return { changed: plan.inserts.length + plan.links.length + plan.updates.length + plan.deletes.length + Object.keys(plan.capitalDeltas).length > 0 };
}

const DailyValuesSchema = z.object({
  date: z.string().regex(DATE),
  values: z.array(z.object({
    accountId: z.string().uuid(),
    value: z.number().positive().max(1e10),
    /** Aportaciones pendientes que este valor ya incluye (el bróker ya las ha invertido). */
    investedContributionIds: z.array(z.string().uuid()).max(100).default([]),
  })).min(1).max(50),
});

/**
 * Guarda de una vez el valor de varias cuentas en una fecha. Las aportaciones marcadas pasan a
 * "invertidas" en esa fecha, y el saldo de la cuenta queda en valor + lo que sigue pendiente
 * (así el dinero en camino no desaparece del saldo mientras el bróker no lo invierte).
 */
export async function saveDailyValues(input: z.input<typeof DailyValuesSchema>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };
  const parsed = DailyValuesSchema.safeParse(input);
  if (!parsed.success) return { error: 'Valores no válidos' };
  const { date, values } = parsed.data;

  const { error: upsertError } = await supabase
    .from('investment_snapshots')
    .upsert(values.map(v => ({ user_id: user.id, account_id: v.accountId, value: v.value, snapshot_date: date })), { onConflict: 'account_id,snapshot_date' });
  if (upsertError) return { error: toActionError(upsertError, 'investments') };

  const invested = values.flatMap(v => v.investedContributionIds);
  if (invested.length) {
    const { error } = await supabase
      .from('investment_contributions')
      .update({ status: 'invested', invested_date: date })
      .in('id', invested)
      .eq('user_id', user.id);
    if (error) return { error: toActionError(error, 'investments') };
  }

  // Saldo actual de cada cuenta: solo si esta fecha es su registro más reciente.
  const ids = values.map(v => v.accountId);
  const [{ data: later }, { data: pending }] = await Promise.all([
    supabase.from('investment_snapshots').select('account_id').eq('user_id', user.id).in('account_id', ids).gt('snapshot_date', date),
    supabase.from('investment_contributions').select('account_id, amount, contribution_date').eq('user_id', user.id).in('account_id', ids).eq('status', 'pending'),
  ]);
  const hasLater = new Set((later || []).map(s => s.account_id));
  for (const v of values) {
    if (hasLater.has(v.accountId)) continue;
    const stillPending = (pending || [])
      .filter(p => p.account_id === v.accountId && Number(p.amount) > 0 && p.contribution_date <= date)
      .reduce((a, p) => a + Number(p.amount), 0);
    const { error } = await supabase.from('accounts').update({ current_balance: v.value + stillPending }).eq('id', v.accountId).eq('user_id', user.id);
    if (error) return { error: toActionError(error, 'investments') };
  }

  revalidatePath('/dashboard/inversiones');
  revalidatePath('/dashboard');
  return { error: null };
}

const MarkSchema = z.object({ id: z.string().uuid(), date: z.string().regex(DATE).nullable() });

/** Marca una aportación como invertida en una fecha, o la devuelve a pendiente (date = null). */
export async function setContributionInvested(input: z.input<typeof MarkSchema>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };
  const parsed = MarkSchema.safeParse(input);
  if (!parsed.success) return { error: 'Datos no válidos' };

  const { error } = await supabase
    .from('investment_contributions')
    .update(parsed.data.date ? { status: 'invested', invested_date: parsed.data.date } : { status: 'pending', invested_date: null })
    .eq('id', parsed.data.id)
    .eq('user_id', user.id);
  if (error) return { error: toActionError(error, 'investments') };
  revalidatePath('/dashboard/inversiones');
  return { error: null };
}
