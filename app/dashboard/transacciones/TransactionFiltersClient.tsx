'use client';

import { useRouter } from 'next/navigation';
import TransactionFilters from '@/components/dashboard/TransactionFilters';

type Account = {
  id: string;
  name: string;
  banks: { name: string };
};

type Category = {
  id: string;
  name: string;
};

type Props = {
  accounts: Account[];
  categories: Category[];
};

export default function TransactionFiltersClient({ accounts, categories }: Props) {
  const router = useRouter();

  const handleFilterChange = (filters: {
    type?: 'income' | 'expense';
    accountId?: string;
    categoryId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const params = new URLSearchParams();

    if (filters.type) params.set('type', filters.type);
    if (filters.accountId) params.set('accountId', filters.accountId);
    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);

    const queryString = params.toString();
    router.push(`/dashboard/transacciones${queryString ? `?${queryString}` : ''}`);
  };

  return (
    <TransactionFilters
      accounts={accounts}
      categories={categories}
      onFilterChange={handleFilterChange}
    />
  );
}