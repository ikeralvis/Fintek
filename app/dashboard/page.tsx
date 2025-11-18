import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Wallet, Settings, TrendingUp, CreditCard, FileText } from 'lucide-react';
import Navbar from '@/components/Navbar';


export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-neutral-50">

      <Navbar />

      
      <div className="container mx-auto px-4 py-8">

  

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-soft p-6">
            <h3 className="text-lg font-semibold text-neutral-700 mb-2">Total Balance</h3>
            <p className="text-3xl font-bold text-primary-600">0,00 €</p>
            <p className="text-sm text-neutral-500 mt-2">En todas tus cuentas</p>
          </div>

          <div className="bg-white rounded-xl shadow-soft p-6">
            <h3 className="text-lg font-semibold text-neutral-700 mb-2">Gastos del Mes</h3>
            <p className="text-3xl font-bold text-accent-600">0,00 €</p>
            <p className="text-sm text-neutral-500 mt-2">Este mes</p>
          </div>

          <div className="bg-white rounded-xl shadow-soft p-6">
            <h3 className="text-lg font-semibold text-neutral-700 mb-2">Ingresos del Mes</h3>
            <p className="text-3xl font-bold text-secondary-600">0,00 €</p>
            <p className="text-sm text-neutral-500 mt-2">Este mes</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-soft p-6">
          <h2 className="text-xl font-bold text-neutral-900 mb-4">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link
              href="/dashboard/configuracion"
              className="flex flex-col items-center justify-center p-6 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors"
            >
              <Settings className="h-8 w-8 text-primary-600 mb-2" />
              <span className="font-semibold text-neutral-900">Configuración</span>
              <span className="text-xs text-neutral-600 mt-1">Bancos y categorías</span>
            </Link>

            <Link
              href="/dashboard/cuentas"
              className="flex flex-col items-center justify-center p-6 bg-secondary-50 rounded-xl hover:bg-secondary-100 transition-colors"
            >
              <CreditCard className="h-8 w-8 text-secondary-600 mb-2" />
              <span className="font-semibold text-neutral-900">Cuentas</span>
              <span className="text-xs text-neutral-600 mt-1">Gestionar cuentas</span>
            </Link>

            <Link
              href="/dashboard/transacciones"
              className="flex flex-col items-center justify-center p-6 bg-accent-50 rounded-xl hover:bg-accent-100 transition-colors"
            >
              <TrendingUp className="h-8 w-8 text-accent-600 mb-2" />
              <span className="font-semibold text-neutral-900">Transacciones</span>
              <span className="text-xs text-neutral-600 mt-1">Registrar movimientos</span>
            </Link>

            <Link
              href="/dashboard/resumen"
              className="flex flex-col items-center justify-center p-6 bg-neutral-100 rounded-xl hover:bg-neutral-200 transition-colors"
            >
              <FileText className="h-8 w-8 text-neutral-600 mb-2" />
              <span className="font-semibold text-neutral-900">Resumen</span>
              <span className="text-xs text-neutral-600 mt-1">Ver informes</span>
            </Link>
          </div>
        </div>

        {/* Getting Started */}
        <div className="mt-6 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl p-8 text-center">
          <div className="max-w-2xl mx-auto">
            <Wallet className="h-16 w-16 text-primary-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">
              ¡Comienza tu viaje financiero!
            </h2>
            <p className="text-neutral-600 mb-6">
              Sigue estos pasos para empezar a gestionar tus finanzas
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-bold">1</div>
                  <h3 className="font-semibold text-neutral-900">Configura</h3>
                </div>
                <p className="text-sm text-neutral-600">Añade tus bancos y categorías</p>
              </div>
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-secondary-600 text-white flex items-center justify-center text-sm font-bold">2</div>
                  <h3 className="font-semibold text-neutral-900">Crea Cuentas</h3>
                </div>
                <p className="text-sm text-neutral-600">Registra tus cuentas bancarias</p>
              </div>
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-accent-600 text-white flex items-center justify-center text-sm font-bold">3</div>
                  <h3 className="font-semibold text-neutral-900">Registra</h3>
                </div>
                <p className="text-sm text-neutral-600">Añade tus transacciones</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
