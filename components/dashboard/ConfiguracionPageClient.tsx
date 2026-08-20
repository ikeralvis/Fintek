'use client';

import { useState } from 'react';
import { Building2, Tag, User, LogOut, Keyboard, Bell } from 'lucide-react';
import BanksManager from './BanksManager';
import CategoriesManager from './CategoriesManager';
import NotificationSettingsManager from './NotificationSettingsManager';

type Tab = 'account' | 'banks' | 'categories' | 'notifications';

const TABS: { id: Tab; label: string; icon: typeof User }[] = [
  { id: 'account', label: 'Cuenta', icon: User },
  { id: 'banks', label: 'Bancos', icon: Building2 },
  { id: 'categories', label: 'Categorías', icon: Tag },
  { id: 'notifications', label: 'Notificaciones', icon: Bell },
];

type Props = {
  user: { email?: string; user_metadata?: { name?: string } };
  userId: string;
  banks: any[];
  categories: any[];
  notificationSettings: any;
};

export default function ConfiguracionPageClient({ user, userId, banks, categories, notificationSettings }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('account');

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 bg-neutral-100 rounded-xl p-1 overflow-x-auto scrollbar-hide">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                activeTab === tab.id ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'account' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-neutral-100 p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-neutral-900 rounded-xl flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-neutral-900 truncate">{user.user_metadata?.name || user.email}</p>
              <p className="text-sm text-neutral-400 truncate">{user.email}</p>
            </div>
          </div>

          <div className="bg-neutral-100 rounded-xl px-4 py-3 flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-neutral-400 shrink-0" />
            <p className="text-xs text-neutral-500">
              <span className="font-semibold">Ctrl+K</span> para búsqueda rápida desde cualquier pantalla
            </p>
          </div>

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
      )}

      {activeTab === 'banks' && (
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
            <BanksManager initialBanks={banks} userId={userId} />
          </div>
        </section>
      )}

      {activeTab === 'categories' && (
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
            <CategoriesManager initialCategories={categories} userId={userId} />
          </div>
        </section>
      )}

      {activeTab === 'notifications' && (
        <NotificationSettingsManager initialSettings={notificationSettings} />
      )}
    </div>
  );
}
