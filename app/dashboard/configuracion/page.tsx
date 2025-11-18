import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BanksManager from '@/components/dashboard/BanksManager';
import CategoriesManager from '@/components/dashboard/CategoriesManager';
import { Settings, Building2, Tag } from 'lucide-react';
import Navbar from '@/components/Navbar';

export default async function ConfiguracionPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Obtener bancos del usuario
  const { data: banks } = await supabase
    .from('banks')
    .select('*')
    .eq('user_id', user.id)
    .order('name', { ascending: true });

  // Obtener categorías del usuario
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .order('name', { ascending: true });

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Settings className="h-8 w-8 text-primary-600" />
            <h1 className="text-3xl font-bold text-neutral-900">Configuración</h1>
          </div>
          <p className="text-neutral-600">
            Gestiona tus bancos y categorías personalizadas
          </p>
        </div>

        {/* Grid de Bancos y Categorías */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bancos */}
          <div className="bg-white rounded-2xl shadow-soft p-6">
            <div className="flex items-center space-x-2 mb-6">
              <Building2 className="h-6 w-6 text-primary-600" />
              <h2 className="text-xl font-bold text-neutral-900">Mis Bancos</h2>
            </div>
            <BanksManager initialBanks={banks || []} userId={user.id} />
          </div>

          {/* Categorías */}
          <div className="bg-white rounded-2xl shadow-soft p-6">
            <div className="flex items-center space-x-2 mb-6">
              <Tag className="h-6 w-6 text-secondary-600" />
              <h2 className="text-xl font-bold text-neutral-900">Mis Categorías</h2>
            </div>
            <CategoriesManager initialCategories={categories || []} userId={user.id} />
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-primary-50 border border-primary-200 rounded-xl p-4">
          <p className="text-sm text-primary-800">
            💡 <strong>Consejo:</strong> Añade todos los bancos y categorías que uses antes de crear tus cuentas y transacciones.
          </p>
        </div>
      </div>
    </div>
  );
}