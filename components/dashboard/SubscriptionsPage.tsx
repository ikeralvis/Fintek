'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Plus, Trash2, Pause, Play, X, Check, Calendar
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
    <div className="min-h-screen bg-neutral-50 pb-32 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-neutral-50/80 backdrop-blur-xl border-b border-neutral-100 px-5 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-neutral-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-neutral-700" />
          </Link>
          <h1 className="text-lg font-semibold text-neutral-900">Suscripciones</h1>
          <button
            onClick={() => setShowForm(true)}
            className="p-2 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-6 space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-neutral-100 p-4">
            <p className="text-xs text-neutral-400 font-medium uppercase mb-1">Gasto mensual</p>
            <p className="text-2xl font-black text-neutral-900 font-mono">{monthlyTotal.toFixed(2)}€</p>
          </div>
          <div className="bg-white rounded-2xl border border-neutral-100 p-4">
            <p className="text-xs text-neutral-400 font-medium uppercase mb-1">Activas</p>
            <p className="text-2xl font-black text-neutral-900">{activeSubs.length}</p>
            {pausedSubs.length > 0 && (
              <p className="text-xs text-neutral-400 mt-1">{pausedSubs.length} pausada{pausedSubs.length > 1 ? 's' : ''}</p>
            )}
          </div>
        </div>

        {/* Active subscriptions */}
        {activeSubs.length === 0 && pausedSubs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-neutral-200 p-12 text-center">
            <Calendar className="w-12 h-12 text-neutral-200 mx-auto mb-3" />
            <p className="text-neutral-500 font-medium mb-1">Sin suscripciones</p>
            <p className="text-sm text-neutral-400 mb-4">Añade tus pagos recurrentes para llevar el control</p>
            <button onClick={() => setShowForm(true)} className="px-5 py-2.5 bg-neutral-900 text-white rounded-xl text-sm font-semibold">
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
                  className={`bg-white rounded-xl border p-4 flex items-center gap-3 transition-all ${
                    isPaused ? 'opacity-50 border-neutral-200' :
                    isUpcoming ? 'border-amber-200' : 'border-neutral-100'
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
                      <Calendar className="w-5 h-5 text-neutral-400" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-neutral-900 truncate">{sub.name}</p>
                      {isUpcoming && (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded-full shrink-0">
                          {daysUntil === 0 ? 'Hoy' : `${daysUntil}d`}
                        </span>
                      )}
                      {isPaused && (
                        <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-500 text-[9px] font-bold rounded-full shrink-0">Pausada</span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 truncate">
                      {getAccountName(sub.account_id)} · {CYCLE_LABELS[sub.billing_cycle]} · {format(parseISO(sub.next_payment_date), "d MMM", { locale: es })}
                    </p>
                  </div>

                  {/* Amount */}
                  <p className="text-sm font-bold text-neutral-900 font-mono shrink-0">{Number(sub.amount).toFixed(2)}€</p>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleStatus(sub.id, sub.status)}
                      className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-400 transition-colors"
                      title={isPaused ? 'Reanudar' : 'Pausar'}
                    >
                      {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(sub.id)}
                      className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-400 transition-colors"
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
          <div className="relative w-full max-w-md mx-4 mb-4 md:mb-0 bg-white rounded-2xl p-6 space-y-4 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-neutral-900">Nueva Suscripción</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-neutral-100 rounded-lg">
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            {/* Name */}
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Netflix, Spotify, Gimnasio..."
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-900 placeholder-neutral-400 outline-none focus:ring-2 focus:ring-neutral-200"
              autoFocus
            />

            {/* Amount + Cycle */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">€</span>
                <input
                  type="number"
                  step="0.01"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="9.99"
                  className="w-full pl-8 pr-3 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-mono font-medium text-neutral-900 placeholder-neutral-300 outline-none focus:ring-2 focus:ring-neutral-200"
                />
              </div>
              <select
                value={formCycle}
                onChange={(e) => setFormCycle(e.target.value)}
                className="px-3 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-900 outline-none"
              >
                <option value="monthly">Mensual</option>
                <option value="yearly">Anual</option>
                <option value="weekly">Semanal</option>
                <option value="bi-weekly">Quincenal</option>
              </select>
            </div>

            {/* Account - OBLIGATORIO */}
            <div>
              <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 block">Cuenta de cargo *</label>
              <select
                value={formAccountId}
                onChange={(e) => setFormAccountId(e.target.value)}
                className="w-full px-3 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-900 outline-none"
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.banks?.name || 'Cuenta'})</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 block">Categoría</label>
              <select
                value={formCategoryId}
                onChange={(e) => setFormCategoryId(e.target.value)}
                className="w-full px-3 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-900 outline-none"
              >
                <option value="">Sin categoría</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Next date */}
            <div>
              <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 block">Próximo cobro</label>
              <input
                type="date"
                value={formNextDate}
                onChange={(e) => setFormNextDate(e.target.value)}
                className="w-full px-3 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-900 outline-none"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleCreate}
              disabled={saving || !formName.trim() || !formAmount || !formAccountId}
              className="w-full py-3.5 bg-neutral-900 text-white rounded-xl font-semibold text-sm disabled:bg-neutral-200 disabled:text-neutral-400 transition-colors"
            >
              {saving ? 'Guardando...' : 'Crear Suscripción'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
