'use client';

import { useDashboard } from '@/lib/DashboardContext';
import StatisticsView from './StatisticsView';
import type { StatTx } from '@/lib/statistics';

export default function StatisticsPageClient() {
  const { transactions, accounts, categories, userId } = useDashboard();

  return (
    <StatisticsView
      transactions={transactions as unknown as StatTx[]}
      accounts={accounts}
      categories={categories}
      userId={userId}
    />
  );
}
