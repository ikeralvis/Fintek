import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import InvestmentsView from '@/components/dashboard/InvestmentsView';

export default async function InversionesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [accountsRes, snapshotsRes] = await Promise.all([
    supabase
      .from('accounts')
      .select('*, banks(name, color, logo_url)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('type', 'investment')
      .order('name'),
    supabase
      .from('investment_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .order('snapshot_date', { ascending: true }),
  ]);

  const accounts = (accountsRes.data || []).map((acc: any) => ({
    ...acc,
    banks: Array.isArray(acc.banks) ? acc.banks[0] : acc.banks,
  }));

  const investmentAccountIds = accounts.map((a: any) => a.id);

  // Transferencias que tocan alguna cuenta de inversión, para poder distinguir
  // aportaciones/retiradas (dinero externo) de rendimiento real del mercado.
  const transfersRes = investmentAccountIds.length > 0
    ? await supabase
        .from('transactions')
        .select('id, amount, account_id, related_account_id, transaction_date')
        .eq('user_id', user.id)
        .eq('type', 'transfer')
        .or(
          `account_id.in.(${investmentAccountIds.join(',')}),related_account_id.in.(${investmentAccountIds.join(',')})`
        )
    : { data: [] };

  return (
    <InvestmentsView
      accounts={accounts}
      snapshots={snapshotsRes.data || []}
      transfers={transfersRes.data || []}
      userId={user.id}
    />
  );
}
