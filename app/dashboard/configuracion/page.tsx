import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BanksManager from '@/components/dashboard/BanksManager';
import CategoriesManager from '@/components/dashboard/CategoriesManager';
import { ArrowLeft, Building2, Tag, User, LogOut, Keyboard } from 'lucide-react';
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
    <div className="min-h-screen bg-neutral-50 pb-32 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-neutral-50/80 backdrop-blur-xl border-b border-neutral-100 px-5 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-neutral-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-neutral-700" />
          </Link>
          <h1 className="text-lg font-semibold text-neutral-900">Configuración</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-6 space-y-6">
        {/* User Card */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-neutral-900 rounded-xl flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-neutral-900 truncate">{user.user_metadata?.name || user.email}</p>
            <p className="text-sm text-neutral-400 truncate">{user.email}</p>
          </div>
        </div>

        {/* Quick info */}
        <div className="bg-neutral-100 rounded-xl px-4 py-3 flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-neutral-400 shrink-0" />
          <p className="text-xs text-neutral-500">
            <span className="font-semibold">Ctrl+K</span> para búsqueda rápida desde cualquier pantalla
          </p>
        </div>

        {/* Main content - 2 cols on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Banks */}
          <section className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            <div className="flex items-center gap-3 p-5 border-b border-neutral-100">
              <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-neutral-900">Entidades Bancarias</h2>
                <p className="text-xs text-neutral-400">{banks.length} banco{banks.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="p-5">
              <BanksManager initialBanks={banks} userId={user.id} />
            </div>
          </section>

          {/* Categories */}
          <section className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            <div className="flex items-center gap-3 p-5 border-b border-neutral-100">
              <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
                <Tag className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-neutral-900">Categorías</h2>
                <p className="text-xs text-neutral-400">{categories.length} categoría{categories.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="p-5">
              <CategoriesManager initialCategories={categories} userId={user.id} />
            </div>
          </section>
        </div>

        {/* Sign Out */}
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-white border border-rose-200 text-rose-600 py-3.5 rounded-2xl font-semibold text-sm hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </form>
      </div>
    </div>
  );
}
