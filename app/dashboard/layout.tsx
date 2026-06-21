import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardNav from '@/components/layout/DashboardNav';
import BottomNav from '@/components/layout/BottomNav';
import CommandSearch from '@/components/dashboard/CommandSearch';
import { DashboardProvider } from '@/lib/DashboardContext';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;

  const [accRes, catRes, txRes] = await Promise.all([
    supabase
      .from('accounts')
      .select('*, banks(id, name, color, logo_url)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('is_favorite', { ascending: false })
      .order('current_balance', { ascending: false }),
    supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name'),
    supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('transaction_date', yearStart)
      .order('transaction_date', { ascending: false }),
  ]);

  const accounts = (accRes.data || []).map((acc: any) => ({
    ...acc,
    banks: Array.isArray(acc.banks) ? acc.banks[0] : acc.banks,
  }));
  const categories = catRes.data || [];
  const rawTransactions = txRes.data || [];

  const catsMap = categories.reduce((m: any, c: any) => ({ ...m, [c.id]: c }), {});
  const accsMap = accounts.reduce((m: any, a: any) => ({ ...m, [a.id]: { id: a.id, name: a.name } }), {});

  const transactions = rawTransactions.map((t: any) => ({
    ...t,
    categories: t.category_id ? catsMap[t.category_id] || null : null,
    accounts: accsMap[t.account_id] || { name: 'Cuenta' },
  }));

  return (
    <div className="min-h-screen bg-neutral-50 pb-20 md:pb-0">
      <DashboardNav
        userName={user.user_metadata?.name}
        userEmail={user.email}
      />
      <DashboardProvider
        initialAccounts={accounts}
        initialCategories={categories}
        initialTransactions={transactions}
        userId={user.id}
      >
        <CommandSearch />
        <main className="animate-in fade-in duration-500">{children}</main>
      </DashboardProvider>
      <BottomNav />
    </div>
  );
}
