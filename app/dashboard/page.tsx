import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Wallet, Settings, TrendingUp, CreditCard } from 'lucide-react';
import DashboardWidgets from '@/components/dashboard/DashboardWidgets';
import MiniTransactions from '@/components/dashboard/MiniTransactions';
import { getSummaryData } from '@/lib/actions/summary';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Obtener estadísticas básicas
  const { data: accounts } = await supabase
    .from('accounts')
    .select('current_balance')
    .eq('user_id', user.id);

  const totalBalance = accounts?.reduce((sum, acc) => sum + acc.current_balance, 0) || 0;

  // Obtener transacciones del mes actual
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const { data: transactions } = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('user_id', user.id)
    .gte('transaction_date', firstDayOfMonth);

  const monthlyIncome = transactions
    ?.filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0) || 0;

  const monthlyExpense = transactions
    ?.filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0) || 0;

  // Summary per month (use summary action to get monthly series and recent transactions)
  const year = new Date().getFullYear();
  const { data: summaryData } = await getSummaryData(year);
  const monthlySeries = [] as any[];
  if (summaryData?.monthlyData) {
    // monthlyData indexed by month number 0-11
    for (let m = 0; m < 12; m++) {
      const md = summaryData.monthlyData[m] || { income: 0, expense: 0 };
      monthlySeries.push({ month: `${year}-${String(m + 1).padStart(2, '0')}`, income: md.income || 0, expense: md.expense || 0 });
    }
  }

  const recentTransactions = summaryData?.transactions?.slice().sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) || [];

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      {/* Welcome Section */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-neutral-900 tracking-tight mb-2">
            ¡Hola, {user.user_metadata?.name || 'Usuario'}! 👋
          </h1>
          <p className="text-lg text-neutral-500 font-medium">
            Aquí tienes un resumen de tus finanzas
          </p>
        </div>
        <div className="text-sm text-neutral-400 font-medium bg-white px-4 py-2 rounded-full border border-neutral-200 shadow-sm">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Quick Stats */}
      <DashboardWidgets totalBalance={totalBalance} monthlyIncome={monthlyIncome} monthlyExpense={monthlyExpense} monthlySeries={monthlySeries} />

      {/* Quick Actions */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-neutral-900 mb-6 tracking-tight">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link
            href="/dashboard/configuracion"
            className="flex flex-col items-start justify-between p-6 bg-white rounded-3xl border border-neutral-200/60 shadow-card hover:shadow-medium hover:-translate-y-1 transition-all duration-300 group h-40"
          >
            <div className="p-3 bg-neutral-100 rounded-2xl text-neutral-600 group-hover:scale-110 transition-transform duration-300">
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <span className="block font-bold text-neutral-900 text-lg">Configuración</span>
              <span className="text-sm text-neutral-500">Bancos y categorías</span>
            </div>
          </Link>

          <Link
            href="/dashboard/cuentas"
            className="flex flex-col items-start justify-between p-6 bg-white rounded-3xl border border-neutral-200/60 shadow-card hover:shadow-medium hover:-translate-y-1 transition-all duration-300 group h-40"
          >
            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:scale-110 transition-transform duration-300">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <span className="block font-bold text-neutral-900 text-lg">Cuentas</span>
              <span className="text-sm text-neutral-500">Gestionar saldos</span>
            </div>
          </Link>

          <Link
            href="/dashboard/transacciones"
            className="flex flex-col items-start justify-between p-6 bg-white rounded-3xl border border-neutral-200/60 shadow-card hover:shadow-medium hover:-translate-y-1 transition-all duration-300 group h-40"
          >
            <div className="p-3 bg-violet-50 rounded-2xl text-violet-600 group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <span className="block font-bold text-neutral-900 text-lg">Transacciones</span>
              <span className="text-sm text-neutral-500">Registrar gastos</span>
            </div>
          </Link>

          <Link
            href="/dashboard/suscripciones"
            className="flex flex-col items-start justify-between p-6 bg-white rounded-3xl border border-neutral-200/60 shadow-card hover:shadow-medium hover:-translate-y-1 transition-all duration-300 group h-40"
          >
            <div className="p-3 bg-fuchsia-50 rounded-2xl text-fuchsia-600 group-hover:scale-110 transition-transform duration-300">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <span className="block font-bold text-neutral-900 text-lg">Suscripciones</span>
              <span className="text-sm text-neutral-500">Gestionar recurrentes</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Getting Started Guide */}
      {(!accounts || accounts.length === 0) && (
        <div className="bg-gradient-to-r from-primary-50 to-violet-50 rounded-3xl p-8 mb-10 border border-primary-100">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex p-4 bg-white rounded-full shadow-sm mb-6">
              <Wallet className="h-8 w-8 text-primary-600" />
            </div>
            <h2 className="text-3xl font-bold text-neutral-900 mb-3 tracking-tight">
              ¡Comienza tu viaje financiero!
            </h2>
            <p className="text-neutral-600 mb-8 max-w-lg mx-auto">
              Sigue estos simples pasos para tomar el control de tu economía personal.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <Link href="/dashboard/configuracion" className="group block">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50 hover:shadow-md transition-all h-full">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-sm">1</span>
                    <h3 className="font-bold text-neutral-900">Configura</h3>
                  </div>
                  <p className="text-sm text-neutral-600">Añade tus bancos y categorías personalizadas</p>
                </div>
              </Link>
              <Link href="/dashboard/cuentas" className="group block">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50 hover:shadow-md transition-all h-full">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-sm">2</span>
                    <h3 className="font-bold text-neutral-900">Cuentas</h3>
                  </div>
                  <p className="text-sm text-neutral-600">Crea tus cuentas y establece sus saldos</p>
                </div>
              </Link>
              <Link href="/dashboard/transacciones" className="group block">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50 hover:shadow-md transition-all h-full">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-sm">3</span>
                    <h3 className="font-bold text-neutral-900">Registra</h3>
                  </div>
                  <p className="text-sm text-neutral-600">Añade tu primera transacción</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Latest Transactions and Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl shadow-card border border-neutral-200/60 overflow-hidden">
            <div className="p-6 border-b border-neutral-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-neutral-900 tracking-tight">Últimos Movimientos</h3>
              <Link href="/dashboard/transacciones" className="text-sm font-medium text-primary-600 hover:text-primary-700">Ver todo</Link>
            </div>
            <div className="p-2">
              <MiniTransactions transactions={recentTransactions} />
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-card border border-neutral-200/60 p-6">
            <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wide mb-4">Resumen Rápido</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-neutral-50 rounded-xl">
                <span className="text-sm font-medium text-neutral-600">Saldo</span>
                <span className="font-bold text-neutral-900">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalBalance)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl">
                <span className="text-sm font-medium text-green-700">Ingresos</span>
                <span className="font-bold text-green-700">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(monthlyIncome)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-xl">
                <span className="text-sm font-medium text-red-700">Gastos</span>
                <span className="font-bold text-red-700">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(monthlyExpense)}</span>
              </div>
            </div>
            <Link href="/dashboard/resumen" className="block mt-4 w-full py-2.5 text-center text-sm font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors">
              Ver reporte completo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}