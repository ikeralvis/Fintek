'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Pause, Play, Trash2, ChevronRight, CalendarClock, PiggyBank, ArrowDownLeft, Receipt } from 'lucide-react';
import { format, parseISO, differenceInCalendarDays, isSameMonth, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import CategoryIcon from '@/components/ui/CategoryIcon';
import SwipeActionRow from './SwipeActionRow';
import { AmountHeroInput } from '@/components/ui/amount-hero-input';
import { AccountPickerSheet } from '@/components/ui/account-picker-sheet';
import { CategoryPickerSheet } from '@/components/ui/category-picker-sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn, formatCurrency } from '@/lib/utils';
import {
  KNOWN_SERVICES, POPULAR_SERVICE_KEYS, matchService, suggestCategoryId, isLightColor, type KnownService,
} from '@/lib/subscriptionCatalog';
import { ServiceLogo } from '@/components/ui/service-logo';
import { invalidateHomeData } from '@/lib/useHomeData';

type Account = { id: string; name: string; current_balance?: number; banks?: { name: string; color: string; logo_url?: string | null } | null };
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
type ViewMode = 'date' | 'type';

const TYPE_OPTIONS: { value: PaymentType; label: string }[] = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Ingreso' },
  { value: 'transfer', label: 'Ahorro' },
];

const CYCLE_LABELS: Record<string, string> = {
  monthly: 'Mensual', yearly: 'Anual', weekly: 'Semanal', 'bi-weekly': 'Quincenal',
};

const CYCLE_OPTIONS = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'yearly', label: 'Anual' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'bi-weekly', label: 'Quincenal' },
];

/** Colores de respaldo para la barra de reparto cuando el pago no es de una marca conocida. */
const FALLBACK_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#06b6d4', '#8b5cf6', '#f97316', '#84cc16'];

/** Importe equivalente por mes, según la frecuencia de cobro. */
function toMonthly(sub: { amount: number; billing_cycle: string }) {
  const amount = Number(sub.amount);
  if (sub.billing_cycle === 'weekly') return (amount * 52) / 12;
  if (sub.billing_cycle === 'bi-weekly') return (amount * 26) / 12;
  if (sub.billing_cycle === 'yearly') return amount / 12;
  return amount;
}

function relativeDay(days: number, date: Date) {
  if (days < 0) return 'Pendiente';
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  if (days <= 7) return `En ${days} días`;
  return format(date, 'd MMM', { locale: es });
}

type Props = {
  initialSubscriptions: Subscription[];
  accounts: Account[];
  categories: Category[];
  userId: string;
};

export default function SubscriptionsPage({ initialSubscriptions, accounts, categories, userId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
  const [viewMode, setViewMode] = useState<ViewMode>('date');
  const [showForm, setShowForm] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isTouchDevice] = useState(() => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches);

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
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  /** Último servicio del catálogo cuyo autocompletado ya se aplicó (para no pisar cambios del usuario). */
  const appliedServiceKey = useRef<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFormName(''); setFormAmount(''); setFormCycle('monthly');
    setFormAccountId(accounts[0]?.id || ''); setFormCategoryId('');
    setFormNextDate(format(new Date(), 'yyyy-MM-dd'));
    setFormType('expense'); setFormToAccountId(''); setFormIsSubscription(true);
    appliedServiceKey.current = null;
  };

  const fillFormFrom = (sub: Subscription) => {
    setFormName(sub.name);
    setFormAmount(sub.amount.toString());
    setFormCycle(sub.billing_cycle);
    setFormAccountId(sub.account_id || accounts[0]?.id || '');
    setFormCategoryId(sub.category_id || '');
    setFormNextDate(sub.next_payment_date.split('T')[0]);
    setFormType(sub.type || 'expense');
    setFormToAccountId(sub.to_account_id || '');
    setFormIsSubscription(sub.is_subscription ?? true);
    appliedServiceKey.current = matchService(sub.name)?.key ?? null;
  };

  const categoriesById = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories]);
  const getCategory = (id?: string) => (id ? categoriesById[id] ?? null : null);
  const getAccountName = (id?: string | null) => (id ? accounts.find(a => a.id === id)?.name || 'Cuenta' : 'Sin cuenta');

  const typeOf = (s: Subscription): PaymentType => s.type || 'expense';
  const isSub = (s: Subscription) => typeOf(s) === 'expense' && (s.is_subscription ?? true);
  const isOtherExpense = (s: Subscription) => typeOf(s) === 'expense' && s.is_subscription === false;
  const sumMonthly = (list: Subscription[]) => list.reduce((acc, s) => acc + toMonthly(s), 0);

  const today = startOfDay(new Date());
  const daysUntil = (s: Subscription) => differenceInCalendarDays(parseISO(s.next_payment_date), today);

  const activeSubs = subscriptions.filter(s => s.status === 'active');
  const pausedSubs = subscriptions.filter(s => s.status === 'paused');
  const byDate = (a: Subscription, b: Subscription) => a.next_payment_date.localeCompare(b.next_payment_date);

  const activeSubscriptions = activeSubs.filter(isSub);
  const monthlyTotal = sumMonthly(activeSubscriptions);
  const monthlyTransfers = sumMonthly(activeSubs.filter(s => typeOf(s) === 'transfer'));
  const monthlyIncome = sumMonthly(activeSubs.filter(s => typeOf(s) === 'income'));
  const monthlyOther = sumMonthly(activeSubs.filter(isOtherExpense));

  // Reparto del gasto en suscripciones: un segmento por servicio, del más caro al más barato.
  const breakdown = useMemo(() => {
    let fallbackIdx = 0;
    return activeSubscriptions
      .map(s => {
        const service = matchService(s.name);
        const cat = getCategory(s.category_id);
        const color = service
          ? (isLightColor(service.bg) ? service.fg : service.bg)
          : cat?.color || FALLBACK_COLORS[fallbackIdx++ % FALLBACK_COLORS.length];
        return { id: s.id, name: s.name, monthly: toMonthly(s), color };
      })
      .sort((a, b) => b.monthly - a.monthly);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptions, categories]);

  const nextCharge = [...activeSubs].filter(s => typeOf(s) !== 'income' && daysUntil(s) >= 0).sort(byDate)[0];

  const groups: { key: string; title: string; total?: number; items: Subscription[] }[] = viewMode === 'date'
    ? [
      { key: 'week', title: 'Próximos 7 días', items: activeSubs.filter(s => daysUntil(s) <= 7).sort(byDate) },
      { key: 'month', title: 'Resto del mes', items: activeSubs.filter(s => daysUntil(s) > 7 && isSameMonth(parseISO(s.next_payment_date), today)).sort(byDate) },
      { key: 'later', title: 'Más adelante', items: activeSubs.filter(s => daysUntil(s) > 7 && !isSameMonth(parseISO(s.next_payment_date), today)).sort(byDate) },
      { key: 'paused', title: 'Pausados', items: pausedSubs },
    ]
    : [
      { key: 'subs', title: 'Suscripciones', total: monthlyTotal, items: [...activeSubs.filter(isSub).sort(byDate), ...pausedSubs.filter(isSub)] },
      { key: 'transfer', title: 'Ahorro y transferencias', total: monthlyTransfers, items: [...activeSubs, ...pausedSubs].filter(s => typeOf(s) === 'transfer') },
      { key: 'other', title: 'Otros pagos fijos', total: monthlyOther, items: [...activeSubs, ...pausedSubs].filter(isOtherExpense) },
      { key: 'income', title: 'Ingresos', total: monthlyIncome, items: [...activeSubs, ...pausedSubs].filter(s => typeOf(s) === 'income') },
    ];
  const visibleGroups = groups.filter(g => g.items.length > 0);

  // ---------- Formulario ----------
  const applyService = (service: KnownService) => {
    appliedServiceKey.current = service.key;
    if (service.cycle) setFormCycle(service.cycle);
    const catId = suggestCategoryId(service, categories);
    if (catId) setFormCategoryId(prev => prev || catId);
  };

  const handleNameChange = (value: string) => {
    setFormName(value);
    if (editingSub || formType !== 'expense') return;
    const service = matchService(value);
    if (service && service.key !== appliedServiceKey.current) applyService(service);
  };

  const pickService = (service: KnownService) => {
    setFormName(service.name);
    applyService(service);
  };

  const openCreateForm = (service?: KnownService) => {
    setEditingSub(null);
    resetForm();
    if (service) { setFormName(service.name); applyService(service); }
    setShowForm(true);
  };
  const openEditForm = (sub: Subscription) => { setEditingSub(sub); fillFormFrom(sub); setShowForm(true); };
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
      invalidateHomeData();
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error(editingSub ? 'Error al actualizar el pago automático' : 'Error al crear el pago automático');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    const { error } = await supabase.from('subscriptions').update({ status: newStatus }).eq('id', id);
    if (error) { toast.error('No se pudo cambiar el estado'); return; }
    setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
    invalidateHomeData();
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
      if (editingSub?.id === sub.id) closeForm();
      invalidateHomeData();
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar el pago automático');
    } finally {
      setDeletingId(null);
    }
  };

  const popularServices = POPULAR_SERVICE_KEYS.map(k => KNOWN_SERVICES.find(s => s.key === k)!).filter(Boolean);
  const isEmpty = subscriptions.length === 0;
  const formService = formType === 'expense' ? matchService(formName) : null;
  const formMonthly = formAmount ? toMonthly({ amount: Number.parseFloat(formAmount) || 0, billing_cycle: formCycle }) : 0;
  const formCategory = getCategory(formCategoryId);

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 glass-nav border-b px-5 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors" aria-label="Volver">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground">Pagos automáticos</h1>
          <button
            onClick={() => openCreateForm()}
            className="p-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
            aria-label="Añadir pago automático"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-6 space-y-6">
        {isEmpty ? (
          /* Estado vacío: atajos a los servicios más comunes en lugar de un formulario en blanco */
          <div className="bg-card rounded-3xl border border-border p-6 sm:p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <CalendarClock className="w-7 h-7 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Controla lo que pagas cada mes</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-sm mx-auto">
              Añade tus suscripciones, recibos y ahorro periódico. Te avisamos antes de cada cobro y verás cuánto te cuestan al año.
            </p>
            <div className="grid grid-cols-4 gap-3 max-w-sm mx-auto mb-6">
              {popularServices.map(s => (
                <button key={s.key} onClick={() => openCreateForm(s)} className="flex flex-col items-center gap-1.5 group">
                  <span className="transition-transform group-active:scale-95"><ServiceLogo name={s.name} size="lg" /></span>
                  <span className="text-[11px] font-medium text-muted-foreground truncate max-w-full">{s.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
            <button onClick={() => openCreateForm()} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold">
              Añadir otro pago
            </button>
          </div>
        ) : (
          <>
            {/* Resumen: una sola cifra protagonista + reparto por servicio */}
            <section className="bg-card rounded-3xl border border-border p-5 sm:p-6">
              <p className="text-sm font-medium text-muted-foreground">Suscripciones al mes</p>
              <p className="text-4xl font-black tracking-tight tabular-nums text-foreground mt-1">{formatCurrency(monthlyTotal)}</p>
              <p className="text-sm text-muted-foreground mt-1 tabular-nums">
                <span className="font-semibold text-foreground">{formatCurrency(monthlyTotal * 12)}</span> al año · {activeSubscriptions.length} activa{activeSubscriptions.length === 1 ? '' : 's'}
                {pausedSubs.length > 0 && <> · {pausedSubs.length} pausado{pausedSubs.length === 1 ? '' : 's'}</>}
              </p>

              {breakdown.length > 0 && (
                <>
                  <div className="flex h-2.5 gap-0.5 rounded-full overflow-hidden mt-5" role="img" aria-label="Reparto del gasto en suscripciones">
                    {breakdown.map(b => (
                      <div key={b.id} style={{ flexGrow: b.monthly, backgroundColor: b.color }} title={`${b.name}: ${formatCurrency(b.monthly)}/mes`} />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                    {breakdown.slice(0, 4).map(b => (
                      <span key={b.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                        <span className="text-foreground font-medium">{b.name}</span>
                        <span className="tabular-nums">{formatCurrency(b.monthly)}</span>
                      </span>
                    ))}
                    {breakdown.length > 4 && <span className="text-xs text-muted-foreground">y {breakdown.length - 4} más</span>}
                  </div>
                </>
              )}

              {nextCharge && (
                <button
                  onClick={() => openEditForm(nextCharge)}
                  className="w-full mt-5 flex items-center gap-3 p-3 rounded-2xl bg-muted/60 hover:bg-muted transition-colors text-left"
                >
                  <ServiceLogo name={nextCharge.name} category={getCategory(nextCharge.category_id)} size="sm" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[11px] text-muted-foreground">Próximo cargo · {relativeDay(daysUntil(nextCharge), parseISO(nextCharge.next_payment_date))}</span>
                    <span className="block text-sm font-semibold text-foreground truncate">{nextCharge.name}</span>
                  </span>
                  <span className="text-sm font-bold tabular-nums text-foreground">{formatCurrency(Number(nextCharge.amount))}</span>
                </button>
              )}
            </section>

            {/* Otros flujos automáticos, fuera del total de suscripciones */}
            {(monthlyTransfers > 0 || monthlyIncome > 0 || monthlyOther > 0) && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {monthlyOther > 0 && (
                  <MiniStat icon={<Receipt className="w-4 h-4" />} label="Otros pagos fijos" value={formatCurrency(monthlyOther)} />
                )}
                {monthlyTransfers > 0 && (
                  <MiniStat icon={<PiggyBank className="w-4 h-4" />} label="Ahorro automático" value={formatCurrency(monthlyTransfers)} tone="positive" />
                )}
                {monthlyIncome > 0 && (
                  <MiniStat icon={<ArrowDownLeft className="w-4 h-4" />} label="Ingresos fijos" value={`+${formatCurrency(monthlyIncome)}`} tone="positive" />
                )}
              </div>
            )}

            {/* Vista */}
            <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit" role="tablist">
              {([['date', 'Por fecha'], ['type', 'Por tipo']] as const).map(([value, label]) => (
                <button
                  key={value}
                  role="tab"
                  aria-selected={viewMode === value}
                  onClick={() => setViewMode(value)}
                  className={cn('px-4 py-1.5 rounded-lg text-xs font-semibold transition-all', viewMode === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="space-y-6">
              {visibleGroups.map(group => (
                <section key={group.key} className="space-y-2">
                  <div className="flex items-baseline justify-between px-1">
                    <h2 className="text-sm font-semibold text-foreground">{group.title}</h2>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {group.total !== undefined && group.total > 0
                        ? `${formatCurrency(group.total)}/mes`
                        : `${group.items.length} pago${group.items.length === 1 ? '' : 's'}`}
                    </span>
                  </div>
                  <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
                    {group.items.map((sub, idx, arr) => {
                      const days = daysUntil(sub);
                      const isPaused = sub.status === 'paused';
                      const isSoon = !isPaused && days <= 3;
                      const type = typeOf(sub);
                      const edge = arr.length === 1 ? 'both' : idx === 0 ? 'top' : idx === arr.length - 1 ? 'bottom' : 'none';
                      const detail = type === 'transfer'
                        ? `${getAccountName(sub.account_id)} → ${getAccountName(sub.to_account_id)}`
                        : getAccountName(sub.account_id);

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
                           * translúcido y las acciones de swipe se transparentan por detrás.
                           */}
                          <div className="px-4 py-3 flex items-center gap-3">
                            <div className={cn(isPaused && 'opacity-40 grayscale')}>
                              <ServiceLogo name={sub.name} category={getCategory(sub.category_id)} />
                            </div>

                            <div className={cn('flex-1 min-w-0', isPaused && 'opacity-60')}>
                              <p className="text-sm font-semibold text-foreground truncate">{sub.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {CYCLE_LABELS[sub.billing_cycle] ?? sub.billing_cycle} · {detail}
                              </p>
                            </div>

                            <div className={cn('text-right shrink-0', isPaused && 'opacity-60')}>
                              <p className={cn('text-sm font-bold tabular-nums', type === 'income' ? 'text-secondary-600 dark:text-secondary-400' : 'text-foreground')}>
                                {type === 'income' ? '+' : ''}{formatCurrency(Number(sub.amount))}
                              </p>
                              <p className={cn('text-[11px] tabular-nums', isSoon ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-muted-foreground')}>
                                {isPaused ? 'Pausado' : relativeDay(days, parseISO(sub.next_payment_date))}
                              </p>
                            </div>

                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleStatus(sub.id, sub.status); }}
                              className="p-1.5 -mr-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-colors shrink-0"
                              aria-label={isPaused ? `Reanudar ${sub.name}` : `Pausar ${sub.name}`}
                              title={isPaused ? 'Reanudar' : 'Pausar'}
                            >
                              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </SwipeActionRow>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Crear / editar: mismo patrón Bottom Sheet que Editar Transacción */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        {/*
          * grid-cols-[minmax(0,1fr)]: DialogContent es un grid y, sin esto, la columna crece hasta
          * el ancho de su contenido más ancho (la tira de servicios con scroll horizontal), lo que
          * desbordaba el sheet y hacía que el importe calculase su tamaño con un ancho enorme.
          * onOpenAutoFocus: Radix enfoca el primer botón (Gasto) y le pinta el anillo de foco; en
          * escritorio llevamos el foco al nombre, en táctil a ninguno para no abrir el teclado.
          */}
        <DialogContent
          className="w-full sm:max-w-md p-0 gap-0 grid-cols-[minmax(0,1fr)] overflow-x-hidden"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            if (!isTouchDevice && !editingSub) nameInputRef.current?.focus();
          }}
        >
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
                  className={cn('flex-1 py-1.5 rounded-lg text-xs font-bold transition-all', formType === o.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {/* Nombre con vista previa del logo */}
            <div className="flex items-center gap-3">
              <ServiceLogo name={formName} category={getCategory(formCategoryId)} size="lg" />
              <input
                type="text"
                value={formName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={formType === 'transfer' ? 'Ahorro mensual, Fondo de emergencia…' : formType === 'income' ? 'Nómina, Alquiler cobrado…' : 'Netflix, Spotify, Gimnasio…'}
                aria-label="Nombre"
                className="flex-1 min-w-0 px-4 py-3 bg-muted/60 border border-border rounded-xl text-base font-semibold text-foreground placeholder:text-muted-foreground placeholder:font-normal outline-none focus:ring-2 focus:ring-ring"
                ref={nameInputRef}
              />
            </div>

            {/* Atajos de servicios populares mientras no haya nombre */}
            {!editingSub && formType === 'expense' && !formName.trim() && (
              <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 scrollbar-none">
                {popularServices.map(s => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => pickService(s)}
                    className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-border bg-card hover:bg-muted transition-colors shrink-0"
                  >
                    <ServiceLogo name={s.name} size="sm" />
                    <span className="text-xs font-medium text-foreground">{s.name}</span>
                  </button>
                ))}
              </div>
            )}

            {formService && !editingSub && (
              <p className="text-[11px] text-muted-foreground -mt-2">
                Reconocido como <span className="font-semibold text-foreground">{formService.name}</span>. Hemos ajustado frecuencia y categoría.
              </p>
            )}

            {/* Importe */}
            <div>
              <AmountHeroInput value={formAmount} onValueChange={setFormAmount} tone={formType} className="py-0" />
              {formMonthly > 0 && (formCycle !== 'monthly' || formType === 'expense') && (
                <p className="text-center text-xs text-muted-foreground tabular-nums">
                  {formCycle !== 'monthly' ? `≈ ${formatCurrency(formMonthly)} al mes` : `${formatCurrency(formMonthly * 12)} al año`}
                </p>
              )}
            </div>

            {/* Frecuencia */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-muted rounded-xl" role="radiogroup" aria-label="Frecuencia">
              {CYCLE_OPTIONS.map(o => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={formCycle === o.value}
                  onClick={() => setFormCycle(o.value)}
                  className={cn('py-1.5 rounded-lg text-xs font-semibold transition-all', formCycle === o.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {/* Detalles: filas compactas, mismo patrón que Nueva Transacción */}
            <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border">
              <AccountPickerSheet
                accounts={accounts}
                value={formAccountId}
                onValueChange={(id) => { setFormAccountId(id); if (id === formToAccountId) setFormToAccountId(''); }}
                label={formType === 'income' ? 'Se ingresa en' : formType === 'transfer' ? 'Desde' : 'Se cobra en'}
                title={formType === 'transfer' ? 'Cuenta de origen' : 'Elegir cuenta'}
              />
              {formType === 'transfer' && (
                <AccountPickerSheet
                  accounts={accounts}
                  value={formToAccountId}
                  onValueChange={setFormToAccountId}
                  label="Hacia"
                  title="Cuenta de destino"
                  excludeIds={[formAccountId]}
                />
              )}
              <button
                type="button"
                onClick={() => setIsCategorySheetOpen(true)}
                className="w-full flex items-center justify-between gap-3 px-3.5 py-3 text-left hover:bg-muted/60 active:bg-muted transition-colors"
              >
                <span className="text-sm text-muted-foreground shrink-0">Categoría</span>
                <span className="flex items-center gap-2 min-w-0">
                  {formCategory ? (
                    <>
                      <span
                        className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                        style={{ backgroundColor: formCategory.color ? `${formCategory.color}26` : 'var(--muted)' }}
                      >
                        <CategoryIcon name={formCategory.icon} className="w-3.5 h-3.5" style={{ color: formCategory.color || 'var(--muted-foreground)' }} />
                      </span>
                      <span className="text-sm font-semibold text-foreground truncate">{formCategory.name}</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Sin categoría</span>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </span>
              </button>
              <label className="w-full flex items-center justify-between gap-3 px-3.5 py-2 cursor-pointer">
                <span className="text-sm text-muted-foreground shrink-0">
                  {formType === 'income' ? 'Próximo ingreso' : formType === 'transfer' ? 'Próxima vez' : 'Próximo cobro'}
                </span>
                <input
                  type="date"
                  value={formNextDate}
                  onChange={(e) => setFormNextDate(e.target.value)}
                  className="min-w-0 bg-transparent text-right text-sm font-semibold text-foreground outline-none py-1"
                />
              </label>
            </div>

            {formType === 'expense' && (
              <button
                type="button"
                role="switch"
                aria-checked={formIsSubscription}
                onClick={() => setFormIsSubscription(v => !v)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-muted/60 border border-border rounded-xl text-left"
              >
                <span>
                  <span className="block text-sm font-medium text-foreground">Es una suscripción</span>
                  <span className="block text-[11px] text-muted-foreground">Desactívalo para recibos como luz o alquiler: se cobran igual, pero no suman al total de suscripciones</span>
                </span>
                <span className={cn('w-10 h-6 rounded-full p-0.5 transition-colors shrink-0', formIsSubscription ? 'bg-primary' : 'bg-border')}>
                  <span className={cn('block w-5 h-5 rounded-full bg-white transition-transform', formIsSubscription && 'translate-x-4')} />
                </span>
              </button>
            )}

            <button
              onClick={handleSubmit}
              disabled={saving || !formName.trim() || !formAmount || !formAccountId || (formType === 'transfer' && !formToAccountId)}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm disabled:bg-muted disabled:text-muted-foreground transition-colors"
            >
              {saving ? 'Guardando…' : editingSub ? 'Guardar cambios' : 'Crear pago automático'}
            </button>

            {/* Acciones del pago existente: en escritorio no hay swipe, así que también van aquí */}
            {editingSub && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={async () => { await handleToggleStatus(editingSub.id, editingSub.status); closeForm(); }}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  {editingSub.status === 'paused' ? <><Play className="w-4 h-4" /> Reanudar</> : <><Pause className="w-4 h-4" /> Pausar</>}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(editingSub)}
                  disabled={deletingId === editingSub.id}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-sm font-semibold text-accent-600 dark:text-accent-400 hover:bg-accent-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CategoryPickerSheet
        open={isCategorySheetOpen}
        onClose={() => setIsCategorySheetOpen(false)}
        categories={categories}
        selectedId={formCategoryId}
        onSelect={setFormCategoryId}
        title="Categoría del pago"
      />
    </div>
  );
}

function MiniStat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: 'positive' }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={cn('text-lg font-bold tabular-nums', tone === 'positive' ? 'text-secondary-600 dark:text-secondary-400' : 'text-foreground')}>
        {value}
        <span className="text-xs font-medium text-muted-foreground">/mes</span>
      </p>
    </div>
  );
}
