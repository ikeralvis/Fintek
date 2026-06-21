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

  return (
    <InvestmentsView
      accounts={accounts}
      snapshots={snapshotsRes.data || []}
      userId={user.id}
    />
  );
}
