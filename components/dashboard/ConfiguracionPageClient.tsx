'use client';

import { useEffect, useState } from 'react';
import {
  Building2, Tag, User, LogOut, Keyboard, Bell, Sun, Moon, Laptop,
  Check, Loader2, KeyRound, ChevronDown,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import BanksManager from './BanksManager';
import CategoriesManager from './CategoriesManager';
import NotificationSettingsManager from './NotificationSettingsManager';
import SecuritySettings from '@/components/security/SecuritySettings';
import { cn } from '@/lib/utils';

type Tab = 'account' | 'banks' | 'categories' | 'notifications';

const TABS: { id: Tab; label: string; icon: typeof User }[] = [
  { id: 'account', label: 'Perfil', icon: User },
  { id: 'banks', label: 'Bancos', icon: Building2 },
  { id: 'categories', label: 'Categorías', icon: Tag },
  { id: 'notifications', label: 'Notificaciones', icon: Bell },
];

const THEME_OPTIONS = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Laptop },
] as const;

type Props = {
  user: { email?: string; user_metadata?: { name?: string }; app_metadata?: { providers?: string[] } };
  userId: string;
  banks: any[];
  categories: any[];
  notificationSettings: any;
};

export default function ConfiguracionPageClient({ user, userId, banks, categories, notificationSettings }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('account');
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const supabase = createClient();

  // --- Nombre de perfil ---
  const [name, setName] = useState(user.user_metadata?.name || '');
  const [savingName, setSavingName] = useState(false);
  const nameChanged = name.trim() !== (user.user_metadata?.name || '') && name.trim().length > 0;

  const handleSaveName = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSavingName(true);
    const { error } = await supabase.auth.updateUser({ data: { name: trimmed } });
    setSavingName(false);
    if (error) {
      toast.error('Error al guardar el nombre: ' + error.message);
    } else {
      toast.success('Nombre actualizado');
    }
  };

  // --- Cambio de contraseña ---
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast.error('Error al cambiar la contraseña: ' + error.message);
      return;
    }
    toast.success('Contraseña actualizada');
    setNewPassword('');
    setConfirmPassword('');
    setIsPasswordOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 overflow-x-auto scrollbar-hide">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                activeTab === tab.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
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
          {/* Avatar + datos de perfil */}
          <div className="bg-primary text-primary-foreground rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 shrink-0 bg-primary-foreground/10 rounded-xl flex items-center justify-center">
              <User className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{user.user_metadata?.name || user.email}</p>
              <p className="text-sm text-primary-foreground/70 truncate">{user.email}</p>
            </div>
          </div>

          {/* Nombre editable */}
          <div className="bg-card rounded-2xl border border-border/60 p-4">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Nombre
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className="flex-1 min-w-0 px-3.5 py-2.5 bg-muted/60 border border-border rounded-xl text-sm font-medium text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={handleSaveName}
                disabled={!nameChanged || savingName}
                className="shrink-0 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-50 transition-opacity flex items-center gap-2"
              >
                {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Guardar
              </button>
            </div>
          </div>

          {/* Cambiar contraseña: sección desplegable */}
          <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
            <button
              type="button"
              onClick={() => setIsPasswordOpen(!isPasswordOpen)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Cambiar contraseña</span>
              </div>
              <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', isPasswordOpen && 'rotate-180')} />
            </button>
            {isPasswordOpen && (
              <div className="border-t border-border p-4 space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Nueva contraseña
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                    className="w-full px-3.5 py-2.5 bg-muted/60 border border-border rounded-xl text-sm font-medium text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Repite la contraseña
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    autoComplete="new-password"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleChangePassword(); }}
                    className="w-full px-3.5 py-2.5 bg-muted/60 border border-border rounded-xl text-sm font-medium text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={savingPassword || !newPassword || !confirmPassword}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                >
                  {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Actualizar contraseña
                </button>
              </div>
            )}
          </div>

          <SecuritySettings
            userId={userId}
            email={user.email ?? ''}
            hasPassword={(user.app_metadata?.providers ?? []).includes('email')}
          />

          {/* Selector de tema de 3 vías */}
          <div className="bg-card rounded-2xl border border-border/60 p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Tema</p>
            <div className="relative flex items-center bg-muted rounded-xl p-1">
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
                const isActive = mounted && theme === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTheme(value)}
                    className={cn(
                      'relative flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors',
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {isActive && (
                      <span className="absolute inset-0 rounded-lg bg-card shadow-sm" />
                    )}
                    <Icon className="relative z-10 w-3.5 h-3.5" />
                    <span className="relative z-10">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-muted/30 border border-border/60 rounded-xl px-4 py-3 flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold">Ctrl+K</span> para búsqueda rápida desde cualquier pantalla
            </p>
          </div>

          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-card border border-accent-500/20 text-accent-600 dark:text-accent-400 py-3.5 rounded-2xl font-semibold text-sm hover:bg-accent-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </form>
        </div>
      )}

      {activeTab === 'banks' && (
        <section className="bg-card rounded-2xl border border-border/60 overflow-hidden">
          <div className="flex items-center gap-3 p-5 border-b border-border/60">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-foreground">Entidades Bancarias</h2>
              <p className="text-xs text-muted-foreground">{banks.length} banco{banks.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="p-5">
            <BanksManager initialBanks={banks} userId={userId} />
          </div>
        </section>
      )}

      {activeTab === 'categories' && (
        <section className="bg-card rounded-2xl border border-border/60 overflow-hidden">
          <div className="flex items-center gap-3 p-5 border-b border-border/60">
            <div className="w-9 h-9 bg-amber-500/10 rounded-xl flex items-center justify-center">
              <Tag className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-foreground">Categorías</h2>
              <p className="text-xs text-muted-foreground">{categories.length} categoría{categories.length !== 1 ? 's' : ''}</p>
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
