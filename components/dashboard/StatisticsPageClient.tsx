'use client';

import { useDashboard } from '@/lib/DashboardContext';
import StatisticsView from './StatisticsView';

export default function StatisticsPageClient() {
  const { transactions, accounts, categories } = useDashboard();

  return (
    <StatisticsView
      initialTransactions={transactions}
      accounts={accounts as any}
      categories={categories}
    />
  );
}
