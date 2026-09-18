'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Plus, Pause, Play, Calendar
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import CategoryIcon from '@/components/ui/CategoryIcon';
import SwipeActionRow from './SwipeActionRow';
import { NumericInput } from '@/components/ui/numeric-input';
import { SelectSheet } from '@/components/ui/select-sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';

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

const CYCLE_OPTIONS = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'yearly', label: 'Anual' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'bi-weekly', label: 'Quincenal' },
];

export default function SubscriptionsPage({ initialSubscriptions, accounts, categories, userId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
  const [showForm, setShowForm] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCycle, setFormCycle] = useState('monthly');
  const [formAccountId, setFormAccountId] = useState(accounts[0]?.id || '');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formNextDate, setFormNextDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!showForm) return;
    if (editingSub) {
      setFormName(editingSub.name);
      setFormAmount(editingSub.amount.toString());
      setFormCycle(editingSub.billing_cycle);
      setFormAccountId(editingSub.account_id || accounts[0]?.id || '');
      setFormCategoryId(editingSub.category_id || '');
      setFormNextDate(editingSub.next_payment_date.split('T')[0]);
    } else {
      resetForm();
    }
  }, [showForm, editingSub]);

  const activeSubs = subscriptions.filter(s => s.status === 'active');
  const pausedSubs = subscriptions.filter(s => s.status === 'paused');

  const monthlyTotal = activeSubs.reduce((acc, s) => {
    let amount = Number(s.amount);
    if (s.billing_cycle === 'weekly') amount *= 4;
    if (s.billing_cycle === 'bi-weekly') amount *= 2;
    if (s.billing_cycle === 'yearly') amount /= 12;
    return acc + amount;
  }, 0);

  const openCreateForm = () => { setEditingSub(null); setShowForm(true); };
  const openEditForm = (sub: Subscription) => { setEditingSub(sub); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingSub(null); };

  const handleSubmit = async () => {
    if (!formName.trim() || !formAmount || !formAccountId) return;
    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        amount: Number.parseFloat(formAmount),
        billing_cycle: formCycle,
        next_payment_date: formNextDate,
        account_id: formAccountId,
        category_id: formCategoryId || null,
      };

      if (editingSub) {
        const { error } = await supabase.from('subscriptions').update(payload).eq('id', editingSub.id);
        if (error) throw error;
        setSubscriptions(prev => prev.map(s => s.id === editingSub.id ? { ...s, ...payload, category_id: payload.category_id ?? undefined } : s));
        toast.success('Suscripción actualizada');
      } else {
        const { data, error } = await supabase.from('subscriptions').insert({
          user_id: userId,
          ...payload,
          status: 'active',
        }).select().single();
        if (error) throw error;
        setSubscriptions(prev => [...prev, data]);
        toast.success('Suscripción creada');
      }

      closeForm();
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error(editingSub ? 'Error al actualizar la suscripción' : 'Error al crear la suscripción');
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
    toast.success(newStatus === 'active' ? 'Suscripción reanudada' : 'Suscripción pausada');
  };

  const handleDelete = async (sub: Subscription) => {
    if (!confirm(`¿Eliminar "${sub.name}"?`)) return;
    setDeletingId(sub.id);
    try {
      const { error } = await supabase.from('subscriptions').delete().eq('id', sub.id);
      if (error) throw error;
      setSubscriptions(prev => prev.filter(s => s.id !== sub.id));
      toast.success('Suscripción eliminada');
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar la suscripción');
    } finally {
      setDeletingId(null);
    }
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
            onClick={openCreateForm}
            className="p-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-6 space-y-5">
        {/* Summary: grid de 2 columnas, limpio en móvil */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Gasto mensual</p>
            <p className="text-2xl font-black tracking-tight tabular-nums text-foreground">{formatCurrency(monthlyTotal)}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Gasto anual</p>
            <p className="text-2xl font-black tracking-tight tabular-nums text-foreground">{formatCurrency(monthlyTotal * 12)}</p>
          </div>
          <div className="col-span-2 bg-card rounded-2xl border border-border px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase">Activas</span>
            <span className="text-sm font-bold text-foreground">
              {activeSubs.length}
              {pausedSubs.length > 0 && (
                <span className="text-muted-foreground font-medium"> · {pausedSubs.length} pausada{pausedSubs.length > 1 ? 's' : ''}</span>
              )}
            </span>
          </div>
        </div>

        {/* Active subscriptions */}
        {activeSubs.length === 0 && pausedSubs.length === 0 ? (
          <div className="bg-card rounded-2xl border border-dashed border-border p-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground/60 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium mb-1">Sin suscripciones</p>
            <p className="text-sm text-muted-foreground mb-4">Añade tus pagos recurrentes para llevar el control</p>
            <button onClick={openCreateForm} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold">
              Añadir Suscripción
            </button>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
            {[...activeSubs, ...pausedSubs].map((sub, idx, arr) => {
              const daysUntil = differenceInDays(parseISO(sub.next_payment_date), new Date());
              const isUpcoming = sub.status === 'active' && daysUntil >= 0 && daysUntil <= 3;
              const isPaused = sub.status === 'paused';
              const cat = getCategoryForSub(sub.category_id);
              const edge = arr.length === 1 ? 'both' : idx === 0 ? 'top' : idx === arr.length - 1 ? 'bottom' : 'none';

              return (
                <SwipeActionRow
                  key={sub.id}
                  onEdit={() => openEditForm(sub)}
                  onDelete={() => handleDelete(sub)}
                  disabled={deletingId === sub.id}
                  edge={edge}
                >
                  {/*
                   * El atenuado de "pausada" va en este wrapper interior, nunca en la capa
                   * frontal de SwipeActionRow: si esa capa pierde opacidad, su fondo se vuelve
                   * translúcido y las acciones de swipe (roja/primary) se transparentan por
                   * detrás incluso en reposo.
                   */}
                  <div className={`px-4 py-3 flex items-center gap-3 ${isPaused ? 'opacity-50' : ''}`}>
                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: cat?.color ? `${cat.color}15` : 'var(--muted)' }}
                    >
                      {cat?.icon ? (
                        <CategoryIcon name={cat.icon} className="w-5 h-5" style={{ color: cat.color || 'var(--muted-foreground)' }} />
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
                    <p className="text-sm font-bold tabular-nums text-foreground shrink-0">{formatCurrency(Number(sub.amount))}</p>

                    {/* Pausar/Reanudar: única acción que se queda visible fuera del swipe */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleStatus(sub.id, sub.status); }}
                      className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-colors shrink-0"
                      title={isPaused ? 'Reanudar' : 'Pausar'}
                    >
                      {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </SwipeActionRow>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Form Modal: mismo patrón Bottom Sheet que Editar Transacción */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="w-full sm:max-w-md p-0 gap-0">
          <DialogHeader className="px-5 py-4 border-b border-border">
            <DialogTitle>{editingSub ? 'Editar Suscripción' : 'Nueva Suscripción'}</DialogTitle>
          </DialogHeader>

          <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4">
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
              <NumericInput
                value={formAmount}
                onValueChange={setFormAmount}
                placeholder="9,99"
                wrapperClassName="flex-1"
                className="bg-muted/60 border-border"
              />
              <SelectSheet
                options={CYCLE_OPTIONS}
                value={formCycle}
                onValueChange={setFormCycle}
                title="Frecuencia de cobro"
                triggerClassName="w-32 bg-muted/60 border-border"
              />
            </div>

            {/* Account - OBLIGATORIO */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Cuenta de cargo *</label>
              <SelectSheet
                options={accounts.map(a => ({ value: a.id, label: a.name, description: a.banks?.name || 'Cuenta' }))}
                value={formAccountId}
                onValueChange={setFormAccountId}
                title="Cuenta de cargo"
                triggerClassName="bg-muted/60 border-border"
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Categoría</label>
              <SelectSheet
                options={[{ value: '', label: 'Sin categoría' }, ...categories.map(c => ({ value: c.id, label: c.name }))]}
                value={formCategoryId}
                onValueChange={setFormCategoryId}
                title="Categoría"
                triggerClassName="bg-muted/60 border-border"
              />
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
              onClick={handleSubmit}
              disabled={saving || !formName.trim() || !formAmount || !formAccountId}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm disabled:bg-muted disabled:text-muted-foreground transition-colors"
            >
              {saving ? 'Guardando...' : editingSub ? 'Guardar Cambios' : 'Crear Suscripción'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
