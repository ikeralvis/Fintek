'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Plus, Trash2, Pause, Play, X, Calendar
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import CategoryIcon from '@/components/ui/CategoryIcon';

type Account = { id: string; name: string; banks?: { name: string; color: string } | null };
type Category = { id: string; name: string; icon?: string; color?: string };
type Subscription = {
  id: string;
  name: string;
  amount: number;
  billing_cycle: string;
  next_payment_date: string;
  status: string;
  account_id?: string;
  category_id?: string;
  logo_url?: string;
};

type Props = {
  initialSubscriptions: Subscription[];
  accounts: Account[];
  categories: Category[];
  userId: string;
};

const CYCLE_LABELS: Record<string, string> = {
  monthly: 'Mensual', yearly: 'Anual', weekly: 'Semanal', 'bi-weekly': 'Quincenal',
};

export default function SubscriptionsPage({ initialSubscriptions, accounts, categories, userId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCycle, setFormCycle] = useState('monthly');
  const [formAccountId, setFormAccountId] = useState(accounts[0]?.id || '');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formNextDate, setFormNextDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);

  const activeSubs = subscriptions.filter(s => s.status === 'active');
  const pausedSubs = subscriptions.filter(s => s.status === 'paused');

  const monthlyTotal = activeSubs.reduce((acc, s) => {
    let amount = Number(s.amount);
    if (s.billing_cycle === 'weekly') amount *= 4;
    if (s.billing_cycle === 'bi-weekly') amount *= 2;
    if (s.billing_cycle === 'yearly') amount /= 12;
    return acc + amount;
  }, 0);

  const handleCreate = async () => {
    if (!formName.trim() || !formAmount || !formAccountId) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from('subscriptions').insert({
        user_id: userId,
        name: formName.trim(),
        amount: parseFloat(formAmount),
        billing_cycle: formCycle,
        next_payment_date: formNextDate,
        account_id: formAccountId,
        category_id: formCategoryId || null,
        status: 'active',
      }).select().single();

      if (error) throw error;
      setSubscriptions(prev => [...prev, data]);
      setShowForm(false);
      resetForm();
    } catch (err) {
      console.error(err);
      alert('Error al crear suscripción');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormName(''); setFormAmount(''); setFormCycle('monthly');
    setFormAccountId(accounts[0]?.id || ''); setFormCategoryId('');
    setFormNextDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    await supabase.from('subscriptions').update({ status: newStatus }).eq('id', id);
    setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta suscripción?')) return;
    await supabase.from('subscriptions').delete().eq('id', id);
    setSubscriptions(prev => prev.filter(s => s.id !== id));
  };

  const getAccountName = (accountId?: string) => {
    if (!accountId) return 'Sin cuenta';
    const acc = accounts.find(a => a.id === accountId);
    return acc?.name || 'Cuenta';
  };

  const getCategoryForSub = (categoryId?: string) => {
    if (!categoryId) return null;
    return categories.find(c => c.id === categoryId);
  };

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 glass-nav border-b px-5 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground">Suscripciones</h1>
          <button
            onClick={() => setShowForm(true)}
            className="p-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-6 space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Gasto mensual</p>
            <p className="text-2xl font-black text-foreground font-mono">{monthlyTotal.toFixed(2)}€</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Gasto anual</p>
            <p className="text-2xl font-black text-foreground font-mono">{(monthlyTotal * 12).toFixed(0)}€</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Activas</p>
            <p className="text-2xl font-black text-foreground">{activeSubs.length}</p>
            {pausedSubs.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{pausedSubs.length} pausada{pausedSubs.length > 1 ? 's' : ''}</p>
            )}
          </div>
        </div>

        {/* Active subscriptions */}
        {activeSubs.length === 0 && pausedSubs.length === 0 ? (
          <div className="bg-card rounded-2xl border border-dashed border-border p-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground/60 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium mb-1">Sin suscripciones</p>
            <p className="text-sm text-muted-foreground mb-4">Añade tus pagos recurrentes para llevar el control</p>
            <button onClick={() => setShowForm(true)} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold">
              Añadir Suscripción
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {[...activeSubs, ...pausedSubs].map(sub => {
              const daysUntil = differenceInDays(parseISO(sub.next_payment_date), new Date());
              const isUpcoming = sub.status === 'active' && daysUntil >= 0 && daysUntil <= 3;
              const isPaused = sub.status === 'paused';
              const cat = getCategoryForSub(sub.category_id);

              return (
                <div
                  key={sub.id}
                  className={`bg-card rounded-xl border p-4 flex items-center gap-3 transition-all ${
                    isPaused ? 'opacity-50 border-border' :
                    isUpcoming ? 'border-amber-200' : 'border-border'
                  }`}
                >
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: cat?.color ? `${cat.color}15` : '#f5f5f5' }}
                  >
                    {cat?.icon ? (
                      <CategoryIcon name={cat.icon} className="w-5 h-5" style={{ color: cat.color || '#666' }} />
                    ) : (
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{sub.name}</p>
                      {isUpcoming && (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded-full shrink-0">
                          {daysUntil === 0 ? 'Hoy' : `${daysUntil}d`}
                        </span>
                      )}
                      {isPaused && (
                        <span className="px-1.5 py-0.5 bg-muted text-muted-foreground text-[9px] font-bold rounded-full shrink-0">Pausada</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {getAccountName(sub.account_id)} · {CYCLE_LABELS[sub.billing_cycle]} · {format(parseISO(sub.next_payment_date), "d MMM", { locale: es })}
                    </p>
                  </div>

                  {/* Amount */}
                  <p className="text-sm font-bold text-foreground font-mono shrink-0">{Number(sub.amount).toFixed(2)}€</p>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleStatus(sub.id, sub.status)}
                      className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-colors"
                      title={isPaused ? 'Reanudar' : 'Pausar'}
                    >
                      {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(sub.id)}
                      className="p-1.5 hover:bg-accent-500/10 rounded-lg text-accent-500 dark:text-accent-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-md mx-4 mb-4 md:mb-0 bg-card rounded-2xl p-6 space-y-4 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Nueva Suscripción</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-muted rounded-lg">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Name */}
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Netflix, Spotify, Gimnasio..."
              className="w-full px-4 py-3 bg-muted/60 border border-border rounded-xl text-sm font-medium text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />

            {/* Amount + Cycle */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                <input
                  type="number"
                  step="0.01"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="9.99"
                  className="w-full pl-8 pr-3 py-3 bg-muted/60 border border-border rounded-xl text-sm font-mono font-medium text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <select
                value={formCycle}
                onChange={(e) => setFormCycle(e.target.value)}
                className="px-3 py-3 bg-muted/60 border border-border rounded-xl text-sm font-medium text-foreground outline-none"
              >
                <option value="monthly">Mensual</option>
                <option value="yearly">Anual</option>
                <option value="weekly">Semanal</option>
                <option value="bi-weekly">Quincenal</option>
              </select>
            </div>

            {/* Account - OBLIGATORIO */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Cuenta de cargo *</label>
              <select
                value={formAccountId}
                onChange={(e) => setFormAccountId(e.target.value)}
                className="w-full px-3 py-3 bg-muted/60 border border-border rounded-xl text-sm font-medium text-foreground outline-none"
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.banks?.name || 'Cuenta'})</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Categoría</label>
              <select
                value={formCategoryId}
                onChange={(e) => setFormCategoryId(e.target.value)}
                className="w-full px-3 py-3 bg-muted/60 border border-border rounded-xl text-sm font-medium text-foreground outline-none"
              >
                <option value="">Sin categoría</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Next date */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Próximo cobro</label>
              <input
                type="date"
                value={formNextDate}
                onChange={(e) => setFormNextDate(e.target.value)}
                className="w-full px-3 py-3 bg-muted/60 border border-border rounded-xl text-sm font-medium text-foreground outline-none"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleCreate}
              disabled={saving || !formName.trim() || !formAmount || !formAccountId}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm disabled:bg-muted disabled:text-muted-foreground transition-colors"
            >
              {saving ? 'Guardando...' : 'Crear Suscripción'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
