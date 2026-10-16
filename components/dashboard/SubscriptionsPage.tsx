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
  type?: 'expense' | 'income' | 'transfer';
  to_account_id?: string | null;
  is_subscription?: boolean;
};

type PaymentType = 'expense' | 'income' | 'transfer';

const TYPE_OPTIONS: { value: PaymentType; label: string }[] = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Ingreso' },
  { value: 'transfer', label: 'Transferencia' },
];

/** Importe equivalente por mes, según la frecuencia de cobro. */
function toMonthly(sub: { amount: number; billing_cycle: string }) {
  const amount = Number(sub.amount);
  if (sub.billing_cycle === 'weekly') return amount * 4;
  if (sub.billing_cycle === 'bi-weekly') return amount * 2;
  if (sub.billing_cycle === 'yearly') return amount / 12;
  return amount;
}

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
  const [formType, setFormType] = useState<PaymentType>('expense');
  const [formToAccountId, setFormToAccountId] = useState('');
  const [formIsSubscription, setFormIsSubscription] = useState(true);
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
      setFormType(editingSub.type || 'expense');
      setFormToAccountId(editingSub.to_account_id || '');
      setFormIsSubscription(editingSub.is_subscription ?? true);
    } else {
      resetForm();
    }
  }, [showForm, editingSub]);

  const activeSubs = subscriptions.filter(s => s.status === 'active');
  const pausedSubs = subscriptions.filter(s => s.status === 'paused');

  const typeOf = (s: Subscription): PaymentType => s.type || 'expense';
  const isSub = (s: Subscription) => typeOf(s) === 'expense' && (s.is_subscription ?? true);
  const isOtherExpense = (s: Subscription) => typeOf(s) === 'expense' && s.is_subscription === false;
  const sumMonthly = (list: Subscription[]) => list.reduce((acc, s) => acc + toMonthly(s), 0);

  // Solo los gastos marcados como suscripción cuentan en el total de suscripciones.
  const monthlyTotal = sumMonthly(activeSubs.filter(isSub));
  const monthlyTransfers = sumMonthly(activeSubs.filter(s => typeOf(s) === 'transfer'));
  const monthlyIncome = sumMonthly(activeSubs.filter(s => typeOf(s) === 'income'));

  const ordered = [...activeSubs, ...pausedSubs];
  const groups: { key: string; title: string; items: Subscription[] }[] = [
    { key: 'subs', title: 'Suscripciones', items: ordered.filter(isSub) },
    { key: 'transfer', title: 'Ahorro y transferencias', items: ordered.filter(s => typeOf(s) === 'transfer') },
    { key: 'other', title: 'Otros pagos', items: ordered.filter(isOtherExpense) },
    { key: 'income', title: 'Ingresos', items: ordered.filter(s => typeOf(s) === 'income') },
  ].filter(g => g.items.length > 0);

  const openCreateForm = () => { setEditingSub(null); setShowForm(true); };
  const openEditForm = (sub: Subscription) => { setEditingSub(sub); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingSub(null); };

  const handleSubmit = async () => {
    if (!formName.trim() || !formAmount || !formAccountId) return;
    if (formType === 'transfer' && (!formToAccountId || formToAccountId === formAccountId)) {
      toast.error('Elige una cuenta de destino distinta a la de origen');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        amount: Number.parseFloat(formAmount),
        billing_cycle: formCycle,
        next_payment_date: formNextDate,
        account_id: formAccountId,
        category_id: formCategoryId || null,
        type: formType,
        to_account_id: formType === 'transfer' ? formToAccountId : null,
        is_subscription: formType === 'expense' ? formIsSubscription : false,
      };

      if (editingSub) {
        const { error } = await supabase.from('subscriptions').update(payload).eq('id', editingSub.id);
        if (error) throw error;
        setSubscriptions(prev => prev.map(s => s.id === editingSub.id ? { ...s, ...payload, category_id: payload.category_id ?? undefined } : s));
        toast.success('Pago automático actualizado');
      } else {
        const { data, error } = await supabase.from('subscriptions').insert({
          user_id: userId,
          ...payload,
          status: 'active',
        }).select().single();
        if (error) throw error;
        setSubscriptions(prev => [...prev, data]);
        toast.success('Pago automático creado');
      }

      closeForm();
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error(editingSub ? 'Error al actualizar el pago automático' : 'Error al crear el pago automático');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormName(''); setFormAmount(''); setFormCycle('monthly');
    setFormAccountId(accounts[0]?.id || ''); setFormCategoryId('');
    setFormNextDate(format(new Date(), 'yyyy-MM-dd'));
    setFormType('expense'); setFormToAccountId(''); setFormIsSubscription(true);
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    await supabase.from('subscriptions').update({ status: newStatus }).eq('id', id);
    setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
    toast.success(newStatus === 'active' ? 'Pago reanudado' : 'Pago pausado');
  };

  const handleDelete = async (sub: Subscription) => {
    if (!confirm(`¿Eliminar "${sub.name}"?`)) return;
    setDeletingId(sub.id);
    try {
      const { error } = await supabase.from('subscriptions').delete().eq('id', sub.id);
      if (error) throw error;
      setSubscriptions(prev => prev.filter(s => s.id !== sub.id));
      toast.success('Pago automático eliminado');
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar el pago automático');
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
          <h1 className="text-lg font-semibold text-foreground">Pagos automáticos</h1>
          <button
            onClick={openCreateForm}
            className="p-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-6 space-y-5">
        {/* Resumen: solo las suscripciones suman al gasto; ahorro e ingresos van aparte */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Suscripciones / mes</p>
            <p className="text-2xl font-black tracking-tight tabular-nums text-foreground">{formatCurrency(monthlyTotal)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">{formatCurrency(monthlyTotal * 12)} al año</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Ahorro auto / mes</p>
            <p className="text-2xl font-black tracking-tight tabular-nums text-secondary-600 dark:text-secondary-400">{formatCurrency(monthlyTransfers)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">{formatCurrency(monthlyTransfers * 12)} al año</p>
          </div>
          {monthlyIncome > 0 && (
            <div className="col-span-2 bg-card rounded-2xl border border-border px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase">Ingresos automáticos / mes</span>
              <span className="text-sm font-bold tabular-nums text-foreground">{formatCurrency(monthlyIncome)}</span>
            </div>
          )}
          <div className="col-span-2 bg-card rounded-2xl border border-border px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase">Activos</span>
            <span className="text-sm font-bold text-foreground">
              {activeSubs.length}
              {pausedSubs.length > 0 && (
                <span className="text-muted-foreground font-medium"> · {pausedSubs.length} pausado{pausedSubs.length > 1 ? 's' : ''}</span>
              )}
            </span>
          </div>
        </div>

        {/* Active subscriptions */}
        {activeSubs.length === 0 && pausedSubs.length === 0 ? (
          <div className="bg-card rounded-2xl border border-dashed border-border p-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground/60 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium mb-1">Sin pagos automáticos</p>
            <p className="text-sm text-muted-foreground mb-4">Suscripciones, ahorro periódico o ingresos que se repiten solos</p>
            <button onClick={openCreateForm} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold">
              Añadir pago automático
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map(group => (
              <div key={group.key} className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">{group.title}</h3>
                <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
                  {group.items.map((sub, idx, arr) => {
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
                        {typeOf(sub) === 'transfer' ? `${getAccountName(sub.account_id)} → ${getAccountName(sub.to_account_id || undefined)}` : getAccountName(sub.account_id)} · {CYCLE_LABELS[sub.billing_cycle]} · {format(parseISO(sub.next_payment_date), "d MMM", { locale: es })}
                      </p>
                    </div>

                    {/* Amount */}
                    <p className={`text-sm font-bold tabular-nums shrink-0 ${typeOf(sub) === 'income' ? 'text-secondary-600 dark:text-secondary-400' : 'text-foreground'}`}>
                      {typeOf(sub) === 'income' ? '+' : ''}{formatCurrency(Number(sub.amount))}
                    </p>

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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Form Modal: mismo patrón Bottom Sheet que Editar Transacción */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="w-full sm:max-w-md p-0 gap-0">
          <DialogHeader className="px-5 py-4 border-b border-border">
            <DialogTitle>{editingSub ? 'Editar pago automático' : 'Nuevo pago automático'}</DialogTitle>
          </DialogHeader>

          <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4">
            {/* Tipo */}
            <div className="flex gap-1 p-1 bg-muted rounded-xl">
              {TYPE_OPTIONS.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setFormType(o.value)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${formType === o.value ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {/* Name */}
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder={formType === 'transfer' ? 'Ahorro mensual, Fondo de emergencia...' : formType === 'income' ? 'Nómina, Alquiler cobrado...' : 'Netflix, Spotify, Gimnasio...'}
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
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">{formType === 'income' ? 'Cuenta de ingreso *' : formType === 'transfer' ? 'Cuenta de origen *' : 'Cuenta de cargo *'}</label>
              <SelectSheet
                options={accounts.map(a => ({ value: a.id, label: a.name, description: a.banks?.name || 'Cuenta' }))}
                value={formAccountId}
                onValueChange={setFormAccountId}
                title="Cuenta de cargo"
                triggerClassName="bg-muted/60 border-border"
              />
            </div>

            {formType === 'transfer' && (
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Cuenta de destino *</label>
                <SelectSheet
                  options={accounts.filter(a => a.id !== formAccountId).map(a => ({ value: a.id, label: a.name, description: a.banks?.name || 'Cuenta' }))}
                  value={formToAccountId}
                  onValueChange={setFormToAccountId}
                  title="Cuenta de destino"
                  triggerClassName="bg-muted/60 border-border"
                />
              </div>
            )}

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

            {formType === 'expense' && (
              <button
                type="button"
                onClick={() => setFormIsSubscription(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-muted/60 border border-border rounded-xl text-left"
              >
                <span>
                  <span className="block text-sm font-medium text-foreground">Cuenta como suscripción</span>
                  <span className="block text-[11px] text-muted-foreground">Si no, se cobra igual pero no suma al total de suscripciones</span>
                </span>
                <span className={`w-10 h-6 rounded-full p-0.5 transition-colors shrink-0 ${formIsSubscription ? 'bg-primary' : 'bg-border'}`}>
                  <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${formIsSubscription ? 'translate-x-4' : ''}`} />
                </span>
              </button>
            )}

            {/* Next date */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">{formType === 'income' ? 'Próximo ingreso' : formType === 'transfer' ? 'Próxima transferencia' : 'Próximo cobro'}</label>
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
              disabled={saving || !formName.trim() || !formAmount || !formAccountId || (formType === 'transfer' && !formToAccountId)}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm disabled:bg-muted disabled:text-muted-foreground transition-colors"
            >
              {saving ? 'Guardando...' : editingSub ? 'Guardar Cambios' : 'Crear pago automático'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
