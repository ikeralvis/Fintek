'use client';

import { useDashboard } from '@/lib/DashboardContext';
import TransactionsView from './TransactionsView';

export default function TransactionsPageClient({ initialPeriod }: { initialPeriod?: string }) {
  const { transactions, accounts, categories } = useDashboard();

  return (
    <TransactionsView
      initialTransactions={transactions}
      accounts={accounts as any}
      categories={categories}
      initialPeriod={initialPeriod}
    />
  );
}
