import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import NetWorthCard from '@/components/dashboard/NetWorthCard';
import QuickActions from '@/components/dashboard/QuickActions';
import AccountList from '@/components/dashboard/AccountList';
import PredictionCard from '@/components/dashboard/PredictionCard';
import RecentTransactionsList from '@/components/dashboard/RecentTransactionsList';
import WalletWidget from '@/components/dashboard/WalletWidget';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const [accountsResult, transactionsResult, recentTxResult, categoriesRes] = await Promise.all([
    supabase
      .from('accounts')
      .select('*, banks(id, name, color, logo_url)')
      .eq('user_id', user.id)
      .order('is_favorite', { ascending: false })
      .order('current_balance', { ascending: false }),

    supabase
      .from('transactions')
      .select('type, amount')
      .eq('user_id', user.id)
      .gte('transaction_date', firstDayOfMonth),

    supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })
      .limit(5),

    supabase.from('categories').select('*').eq('user_id', user.id)
  ]);

  const accountsData = accountsResult.data || [];
  const transactions = transactionsResult.data || [];
  const rawRecentTx = recentTxResult.data || [];
  const categoriesMap = (categoriesRes.data || []).reduce((acc: any, c: any) => ({ ...acc, [c.id]: c }), {});

  const recentTransactions = rawRecentTx.map((t: any) => {
    const cat = categoriesMap[t.category_id];
    return {
      ...t,
      categories: cat || { name: 'General', icon: '💰', color: '#737373' }
    };
  });

  const totalBalance = accountsData.reduce((sum: number, acc: any) => sum + acc.current_balance, 0);
  const monthlyIncome = transactions
    .filter((t: any) => t.type === 'income')
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const monthlyExpense = transactions
    .filter((t: any) => t.type === 'expense')
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const walletAccount = accountsData.find((a: any) => a.type === 'wallet');
  const bankAccounts = accountsData.filter((a: any) => a.type !== 'wallet');

  // Get user's first name for greeting
  const firstName = user.user_metadata?.name?.split(' ')[0] || 'Usuario';

  return (
    <div className="min-h-screen bg-neutral-50 pb-32">
      {/* Hero Section */}
      <div className="px-5 pt-8 pb-6">
        <p className="text-sm text-neutral-400 font-medium">Hola,</p>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{firstName} 👋</h1>
      </div>

      <div className="px-5 space-y-6">
        {/* Balance Card */}
        <NetWorthCard totalBalance={totalBalance} monthlyIncome={monthlyIncome} monthlyExpense={monthlyExpense} />

        {/* Quick Actions */}
        <QuickActions />

        {/* Accounts */}
        <AccountList accounts={bankAccounts} />

        {/* Wallet Widget */}
        {walletAccount && (
          <div>
            <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">Mi Cartera</h3>
            <WalletWidget walletAccount={walletAccount} />
          </div>
        )}

        {/* AI Prediction */}
        <PredictionCard />

        {/* Recent Transactions */}
        <RecentTransactionsList transactions={recentTransactions} />
      </div>
    </div>
  );
}