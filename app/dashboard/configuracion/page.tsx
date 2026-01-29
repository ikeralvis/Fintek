import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BanksManager from '@/components/dashboard/BanksManager';
import CategoriesManager from '@/components/dashboard/CategoriesManager';
import { ArrowLeft, Building2, Tag } from 'lucide-react';
import Link from 'next/link';

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [banksRes, catsRes] = await Promise.all([
    supabase.from('banks').select('*').eq('user_id', user.id).order('name'),
    supabase.from('categories').select('*').eq('user_id', user.id).order('name')
  ]);

  const banks = banksRes.data || [];
  const categories = catsRes.data || [];

  return (
    <div className="min-h-screen bg-neutral-50 pb-32">
      {/* Simple Header */}
      <div className="bg-white border-b border-neutral-100 sticky top-0 z-10 px-4 h-14 flex items-center">
        <Link href="/dashboard" className="p-2 rounded-xl hover:bg-neutral-100 transition-colors mr-3">
          <ArrowLeft className="w-5 h-5 text-neutral-700" />
        </Link>
        <h1 className="text-lg font-bold text-neutral-900">Configuración</h1>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-8">
        {/* Banks Section */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Entidades Bancarias</h2>
              <p className="text-xs text-neutral-500">Añade tus bancos y sus colores</p>
            </div>
          </div>
          <BanksManager initialBanks={banks} userId={user.id} />
        </section>

        <hr className="border-neutral-100" />

        {/* Categories Section */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Tag className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Categorías</h2>
              <p className="text-xs text-neutral-500">Iconos y colores para tus gastos</p>
            </div>
          </div>
          <CategoriesManager initialCategories={categories} userId={user.id} />
        </section>
      </div>
    </div>
  );
}