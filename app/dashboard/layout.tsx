import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardNav from '@/components/layout/DashboardNav';
import BottomNav from '@/components/layout/BottomNav';
import CommandSearch from '@/components/dashboard/CommandSearch';
import { DashboardProvider } from '@/lib/DashboardContext';
import { Skeleton } from '@/components/ui/skeleton';

/** Shell estático: se pinta al instante (nav + esqueleto) sin esperar a los datos. */
function DashboardShellFallback() {
  return (
    <div className="px-5 pt-8 pb-6 md:max-w-6xl md:mx-auto">
      <Skeleton className="h-7 w-40 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        <div className="md:col-span-8 space-y-5">
          <Skeleton className="h-44 rounded-2xl" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="flex-1 h-16 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <div className="md:col-span-4 space-y-5">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

async function DashboardData({ userId, children }: { userId: string; children: React.ReactNode }) {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;

  const [accRes, catRes, txRes] = await Promise.all([
    supabase
      .from('accounts')
      .select('*, banks(id, name, color, logo_url)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('is_favorite', { ascending: false })
      .order('current_balance', { ascending: false }),
    supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('name'),
    supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
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
    <DashboardProvider
      initialAccounts={accounts}
      initialCategories={categories}
      initialTransactions={transactions}
      userId={userId}
    >
      <CommandSearch />
      <main className="animate-in fade-in duration-500">{children}</main>
    </DashboardProvider>
  );
}

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

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <DashboardNav
        userName={user.user_metadata?.name}
        userEmail={user.email}
      />
      <Suspense fallback={<DashboardShellFallback />}>
        <DashboardData userId={user.id}>{children}</DashboardData>
      </Suspense>
      <BottomNav />
    </div>
  );
}
