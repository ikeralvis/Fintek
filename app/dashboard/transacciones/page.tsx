import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TrendingUp } from 'lucide-react';
import TransactionForm from '@/components/dashboard/TransactionForm';
import TransactionFilters from '@/components/dashboard/TransactionFilters';
import TransactionsList from '@/components/dashboard/TransactionsList';
import { getTransactions } from '@/lib/actions/transactions';

type SearchParams = {
  type?: 'income' | 'expense';
  accountId?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export default async function TransaccionesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Obtener cuentas
  const { data: accounts } = await supabase
    .from('accounts')
    .select(`
      id,
      name,
      banks (
        name
      )
    `)
    .eq('user_id', user.id)
    .order('name', { ascending: true });

  // Obtener categorías
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .order('name', { ascending: true });

  const resolvedSearchParams = await Promise.resolve(searchParams);

  // Obtener transacciones con filtros
  const filters: any = {};
  if (resolvedSearchParams.type) filters.type = resolvedSearchParams.type;
  if (resolvedSearchParams.accountId) filters.accountId = resolvedSearchParams.accountId;
  if (resolvedSearchParams.categoryId) filters.categoryId = resolvedSearchParams.categoryId;
  if (resolvedSearchParams.dateFrom) filters.dateFrom = resolvedSearchParams.dateFrom;
  if (resolvedSearchParams.dateTo) filters.dateTo = resolvedSearchParams.dateTo;

  const { data: transactions } = await getTransactions(filters);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <TrendingUp className="h-8 w-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-neutral-900">Transacciones</h1>
        </div>
        <p className="text-neutral-600">
          Registra y gestiona tus gastos e ingresos
        </p>
      </div>

      <div className="space-y-6">
        {/* Formulario de Nueva Transacción */}
        <TransactionForm 
          accounts={
            (accounts || []).map((account: any) => ({
              id: account.id,
              name: account.name,
              banks: { name: account.banks?.name || '' }
            }))
          }
          categories={categories || []} 
        />

        {/* Filtros */}
        <TransactionFiltersClient 
          accounts={
            (accounts || []).map((account: any) => ({
              id: account.id,
              name: account.name,
              banks: { name: account.banks?.name || '' }
            }))
          }
          categories={categories || []} 
        />

        {/* Lista de Transacciones */}
        <TransactionsList transactions={transactions || []} />
      </div>
    </div>
  );
}

// Client Component para manejar filtros con navegación
import TransactionFiltersClient from './TransactionFiltersClient';