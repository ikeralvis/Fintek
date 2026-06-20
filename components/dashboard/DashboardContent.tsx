'use client';

import { useMemo } from 'react';
import { useDashboard } from '@/lib/DashboardContext';
import NetWorthCard from './NetWorthCard';
import QuickActions from './QuickActions';
import AccountList from './AccountList';
import RecentTransactionsList from './RecentTransactionsList';
import WalletWidget from './WalletWidget';

export default function DashboardContent({ firstName }: { readonly firstName: string }) {
  const { accounts, transactions } = useDashboard();

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const { totalBalance, monthlyIncome, monthlyExpense, recentTransactions, walletAccount, bankAccounts } = useMemo(() => {
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.current_balance, 0);

    const monthTx = transactions.filter(t => t.transaction_date >= firstDayOfMonth);
    const monthlyIncome = monthTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpense = monthTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    const recentTransactions = transactions.slice(0, 5);
    const walletAccount = accounts.find(a => a.type === 'wallet');
    const bankAccounts = accounts.filter(a => a.type !== 'wallet');

    return { totalBalance, monthlyIncome, monthlyExpense, recentTransactions, walletAccount, bankAccounts };
  }, [accounts, transactions, firstDayOfMonth]);

  return (
    <div className="min-h-screen bg-neutral-50 pb-32 md:pb-8">
      <div className="px-5 pt-8 pb-6 md:max-w-6xl md:mx-auto">
        <p className="text-sm text-neutral-400 font-medium">Hola,</p>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{firstName}</h1>
      </div>

      <div className="px-5 md:max-w-6xl md:mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-8 space-y-5">
            <NetWorthCard totalBalance={totalBalance} monthlyIncome={monthlyIncome} monthlyExpense={monthlyExpense} />
            <QuickActions />
            <RecentTransactionsList transactions={recentTransactions} />
          </div>

          <div className="md:col-span-4 space-y-5">
            <AccountList accounts={bankAccounts as any} />
            {walletAccount && (
              <div>
                <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">Mi Cartera</h3>
                <WalletWidget walletAccount={walletAccount} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
