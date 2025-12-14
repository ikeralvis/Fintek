import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BanksManager from '@/components/dashboard/BanksManager';
import CategoriesManager from '@/components/dashboard/CategoriesManager';
import { Settings, Building2, Tag } from 'lucide-react';

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
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2.5 bg-neutral-100 rounded-xl">
            <Settings className="h-6 w-6 text-neutral-600" />
          </div>
          <h1 className="text-4xl font-bold text-neutral-900 tracking-tight">Configuración</h1>
        </div>
        <p className="text-lg text-neutral-500 font-medium ml-12">
          Gestiona tus bancos y categorías personalizadas
        </p>
      </div>

      {/* Grid de Bancos y Categorías */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bancos */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-card border border-white/50 p-6">
          <div className="flex items-center space-x-2 mb-6 pb-4 border-b border-neutral-100">
            <Building2 className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-neutral-900">Mis Bancos</h2>
          </div>
          <BanksManager initialBanks={banks || []} userId={user.id} />
        </div>

        {/* Categorías */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-card border border-white/50 p-6">
          <div className="flex items-center space-x-2 mb-6 pb-4 border-b border-neutral-100">
            <Tag className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-bold text-neutral-900">Mis Categorías</h2>
          </div>
          <CategoriesManager initialCategories={categories || []} userId={user.id} />
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-neutral-50 border border-neutral-200 rounded-2xl p-6 flex items-start space-x-3">
        <div className="p-2 bg-white rounded-full mt-0.5 border border-neutral-100 shadow-sm">
          <Settings className="h-4 w-4 text-neutral-600" />
        </div>
        <div>
          <h4 className="font-bold text-neutral-900 text-sm mb-1">Personaliza tu experiencia</h4>
          <p className="text-sm text-neutral-600">
            Añade todos los bancos y categorías que uses frecuentemente. Esto te ayudará a organizar mejor tus transacciones y cuentas.
          </p>
        </div>
      </div>
    </div>
  );
}