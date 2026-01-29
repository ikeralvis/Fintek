import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BanksManager from '@/components/dashboard/BanksManager';
import CategoriesManager from '@/components/dashboard/CategoriesManager';
import { ArrowLeft, Building2, Tag, Settings, User, ChevronRight } from 'lucide-react';
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
      {/* Header */}
      <div className="sticky top-0 z-20 bg-neutral-50/80 backdrop-blur-xl px-5 py-4">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-neutral-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-neutral-700" />
          </Link>
          <h1 className="text-lg font-semibold text-neutral-900">Configuración</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="px-5 space-y-6 max-w-2xl mx-auto">
        {/* User Info Card */}
        <div className="bg-white rounded-2xl p-5 border border-neutral-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-neutral-200 to-neutral-300 rounded-2xl flex items-center justify-center">
              <User className="w-7 h-7 text-neutral-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-neutral-900 truncate">{user.email}</p>
              <p className="text-sm text-neutral-400">Cuenta personal</p>
            </div>
          </div>
        </div>

        {/* Banks Section */}
        <section className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          <div className="flex items-center gap-4 p-5 border-b border-neutral-100">
            <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center">
              <Building2 className="h-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-neutral-900">Entidades Bancarias</h2>
              <p className="text-xs text-neutral-400">{banks.length} banco{banks.length !== 1 ? 's' : ''} configurado{banks.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="p-5">
            <BanksManager initialBanks={banks} userId={user.id} />
          </div>
        </section>

        {/* Categories Section */}
        <section className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          <div className="flex items-center gap-4 p-5 border-b border-neutral-100">
            <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center">
              <Tag className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-neutral-900">Categorías</h2>
              <p className="text-xs text-neutral-400">{categories.length} categoría{categories.length !== 1 ? 's' : ''} creada{categories.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="p-5">
            <CategoriesManager initialCategories={categories} userId={user.id} />
          </div>
        </section>

        {/* Sign Out Button */}
        <form action="/api/auth/signout" method="post">
          <button 
            type="submit" 
            className="w-full bg-rose-50 text-rose-600 py-4 rounded-2xl font-semibold text-sm hover:bg-rose-100 transition-colors"
          >
            Cerrar Sesión
          </button>
        </form>
      </div>
    </div>
  );
}