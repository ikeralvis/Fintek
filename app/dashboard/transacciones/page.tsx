import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TrendingUp } from 'lucide-react';
import TransactionForm from '@/components/dashboard/TransactionForm';
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
  readonly searchParams: SearchParams;
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
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2.5 bg-violet-50 rounded-xl">
              <TrendingUp className="h-6 w-6 text-violet-600" />
            </div>
            <h1 className="text-4xl font-bold text-neutral-900 tracking-tight">Transacciones</h1>
          </div>
          <p className="text-lg text-neutral-500 font-medium ml-12">
            Registra y gestiona tus gastos e ingresos
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar: Formulario (Sticky en Desktop) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-card border border-white/50 p-6 sticky top-8">
            <h2 className="text-lg font-bold text-neutral-900 mb-4">Nueva Transacción</h2>
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
          </div>
        </div>

        {/* Contenido Principal: Filtros + Lista */}
        <div className="lg:col-span-8 space-y-6">
          {/* Filtros arriba */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-card border border-white/50 p-6">
            <h2 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
              Filtros
            </h2>
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
          </div>

          {/* Lista de Transacciones */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-card border border-white/50 p-6 min-h-[500px]">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-200/50">
              <h2 className="text-xl font-bold text-neutral-900">Historial</h2>
              <span className="text-sm text-neutral-500 bg-neutral-100/50 px-3 py-1 rounded-full">{transactions?.length || 0} movimientos</span>
            </div>
            <TransactionsList transactions={transactions || []} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Client Component para manejar filtros con navegación
import TransactionFiltersClient from './TransactionFiltersClient';