import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import PocketsView from '@/components/dashboard/PocketsView';

export default async function PocketsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [accountRes, pocketsRes] = await Promise.all([
    supabase.from('accounts').select('id, name, current_balance').eq('id', id).eq('user_id', user.id).single(),
    supabase.from('account_pockets').select('*').eq('account_id', id).eq('user_id', user.id).order('created_at'),
  ]);

  if (accountRes.error || !accountRes.data) notFound();

  return <PocketsView account={accountRes.data} pockets={pocketsRes.data || []} />;
}
