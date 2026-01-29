import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
// Removed QuickSummary from duplicate
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
  // Exclude transfers from income/expense calculations
  const monthlyIncome = transactions
    .filter((t: any) => t.type === 'income')
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const monthlyExpense = transactions
    .filter((t: any) => t.type === 'expense')
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  // Find Wallet Account for Widget
  const walletAccount = accountsData.find((a: any) => a.type === 'wallet');

  // Filter accounts for the list (Exclude wallet if we already show the widget to avoid duplication)
  // Or user wants "Favorite Accounts" list. If Wallet is favorite, it might appear in AccountList too.
  // The user said: "En el dashboard ahora esta ducplcado sale 3 veces lo de mi cartera."
  // It appears in: 1. AccountList, 2. WalletWidget, 3. Probably QuickActions or Duplicate Widget code?
  // Let's ensure AccountList filters out type='wallet' OR we tell AccountList not to render it.
  const bankAccounts = accountsData.filter((a: any) => a.type !== 'wallet');

  return (
    <div className="container mx-auto px-4 pt-6 pb-40 max-w-lg md:max-w-4xl lg:max-w-6xl">
      {/* 1. Balance Global */}
      <NetWorthCard totalBalance={totalBalance} monthlyIncome={monthlyIncome} monthlyExpense={monthlyExpense} />

      {/* 2. Botones de Acción */}
      <div className="mt-6">
        <QuickActions />
      </div>

      {/* 3. Cuentas Favoritas (Excluding Wallet to avoid dupes) */}
      <div className="mt-8">
        <AccountList accounts={bankAccounts} />
      </div>

      {/* 4. Mi Cartera */}
      {walletAccount && (
        <div className="mt-8">
          <h3 className="text-lg font-bold text-neutral-900 mb-4 px-2">Mi Cartera</h3>
          <WalletWidget walletAccount={walletAccount} />
        </div>
      )}

      {/* 5. Predicción IA */}
      <div className="mt-8">
        <PredictionCard />
      </div>

      {/* 6. Transacciones Recientes */}
      <div className="mt-8">
        <RecentTransactionsList transactions={recentTransactions} />
      </div>
    </div>
  );
}