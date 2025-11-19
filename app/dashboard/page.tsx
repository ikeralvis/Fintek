import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Wallet, Settings, TrendingUp, CreditCard, FileText } from 'lucide-react';

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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">
          ¡Hola, {user.user_metadata?.name || 'Usuario'}! 👋
        </h1>
        <p className="text-neutral-600">
          Aquí tienes un resumen de tus finanzas
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-soft p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-neutral-600">Patrimonio Total</h3>
            <Wallet className="h-5 w-5 text-primary-600" />
          </div>
          <p className="text-3xl font-bold text-primary-600">
            {new Intl.NumberFormat('es-ES', {
              style: 'currency',
              currency: 'EUR',
            }).format(totalBalance)}
          </p>
          <p className="text-xs text-neutral-500 mt-2">
            En {accounts?.length || 0} {accounts?.length === 1 ? 'cuenta' : 'cuentas'}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-soft p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-neutral-600">Ingresos del Mes</h3>
            <TrendingUp className="h-5 w-5 text-secondary-600" />
          </div>
          <p className="text-3xl font-bold text-secondary-600">
            {new Intl.NumberFormat('es-ES', {
              style: 'currency',
              currency: 'EUR',
            }).format(monthlyIncome)}
          </p>
          <p className="text-xs text-neutral-500 mt-2">
            {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-soft p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-neutral-600">Gastos del Mes</h3>
            <TrendingUp className="h-5 w-5 text-accent-600 rotate-180" />
          </div>
          <p className="text-3xl font-bold text-accent-600">
            {new Intl.NumberFormat('es-ES', {
              style: 'currency',
              currency: 'EUR',
            }).format(monthlyExpense)}
          </p>
          <p className="text-xs text-neutral-500 mt-2">
            {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-soft p-6 mb-8">
        <h2 className="text-xl font-bold text-neutral-900 mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/dashboard/configuracion"
            className="flex flex-col items-center justify-center p-6 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors group"
          >
            <Settings className="h-8 w-8 text-primary-600 mb-2 group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-neutral-900">Configuración</span>
            <span className="text-xs text-neutral-600 mt-1 text-center">Bancos y categorías</span>
          </Link>

          <Link
            href="/dashboard/cuentas"
            className="flex flex-col items-center justify-center p-6 bg-secondary-50 rounded-xl hover:bg-secondary-100 transition-colors group"
          >
            <CreditCard className="h-8 w-8 text-secondary-600 mb-2 group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-neutral-900">Cuentas</span>
            <span className="text-xs text-neutral-600 mt-1 text-center">Gestionar cuentas</span>
          </Link>

          <Link
            href="/dashboard/transacciones"
            className="flex flex-col items-center justify-center p-6 bg-accent-50 rounded-xl hover:bg-accent-100 transition-colors group"
          >
            <TrendingUp className="h-8 w-8 text-accent-600 mb-2 group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-neutral-900">Transacciones</span>
            <span className="text-xs text-neutral-600 mt-1 text-center">Registrar movimientos</span>
          </Link>

          <Link
            href="/dashboard/resumen"
            className="flex flex-col items-center justify-center p-6 bg-neutral-100 rounded-xl hover:bg-neutral-200 transition-colors group"
          >
            <FileText className="h-8 w-8 text-neutral-600 mb-2 group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-neutral-900">Resumen</span>
            <span className="text-xs text-neutral-600 mt-1 text-center">Ver informes</span>
          </Link>
        </div>
      </div>

      {/* Getting Started Guide */}
      {(!accounts || accounts.length === 0) && (
        <div className="bg-linear-to-r from-primary-50 to-secondary-50 rounded-2xl p-8">
          <div className="max-w-3xl mx-auto text-center">
            <Wallet className="h-16 w-16 text-primary-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">
              ¡Comienza tu viaje financiero!
            </h2>
            <p className="text-neutral-600 mb-8">
              Sigue estos pasos para empezar a gestionar tus finanzas
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="bg-white rounded-xl p-6 shadow-soft">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <h3 className="font-semibold text-neutral-900">Configura</h3>
                </div>
                <p className="text-sm text-neutral-600 mb-3">
                  Añade tus bancos y categorías personalizadas
                </p>
                <Link
                  href="/dashboard/configuracion"
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  Ir a Configuración →
                </Link>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-soft">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-secondary-600 text-white flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <h3 className="font-semibold text-neutral-900">Crea Cuentas</h3>
                </div>
                <p className="text-sm text-neutral-600 mb-3">
                  Registra tus cuentas bancarias con sus saldos
                </p>
                <Link
                  href="/dashboard/cuentas"
                  className="text-sm font-medium text-secondary-600 hover:text-secondary-700"
                >
                  Crear Cuenta →
                </Link>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-soft">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-accent-600 text-white flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <h3 className="font-semibold text-neutral-900">Registra</h3>
                </div>
                <p className="text-sm text-neutral-600 mb-3">
                  Añade tus transacciones diarias
                </p>
                <Link
                  href="/dashboard/transacciones"
                  className="text-sm font-medium text-accent-600 hover:text-accent-700"
                >
                  Nueva Transacción →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}