'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { differenceInDays, isSameMonth, parseISO } from 'date-fns';
import { AlertTriangle, Bell, CalendarClock, TrendingDown, X } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useDashboard } from '@/lib/DashboardContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from '@/components/ui/dropdown-menu';
import { cn, formatCurrency } from '@/lib/utils';

type Budget = { id: string; category_id: string; amount: number; is_savings: boolean };
type Subscription = { id: string; name: string; amount: number; next_payment_date: string; status: string };

type Alert = {
    id: string;
    tone: 'danger' | 'warning';
    icon: typeof AlertTriangle;
    title: string;
    subtitle: string;
    href: string;
};

const DISMISSED_KEY = 'fintek:dismissedAlerts';

function loadDismissed(): Set<string> {
    if (typeof window === 'undefined') return new Set();
    try {
        const raw = window.localStorage.getItem(DISMISSED_KEY);
        return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
        return new Set();
    }
}

/**
 * Campana de avisos financieros (header): presupuestos al límite/superados, suscripciones
 * que cobran en los próximos 3 días y cuentas en negativo. Popover anclado en desktop,
 * Bottom Sheet en móvil. Vive en el header en vez de como tarjeta del feed de Inicio para
 * no bloquear el scroll principal con contenido que cambia de tamaño constantemente.
 */
export default function AlertsBell() {
    const { accounts, transactions, categories, userId } = useDashboard();
    const [budgets, setBudgets] = useState<Budget[] | null>(null);
    const [subscriptions, setSubscriptions] = useState<Subscription[] | null>(null);
    const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    useEffect(() => {
        setDismissed(loadDismissed());
        const supabase = createClient();
        let cancelled = false;

        supabase.from('budgets').select('id, category_id, amount, is_savings').eq('user_id', userId)
            .then(({ data }) => { if (!cancelled) setBudgets(data || []); });

        supabase.from('subscriptions').select('id, name, amount, next_payment_date, status')
            .eq('user_id', userId).eq('status', 'active')
            .then(({ data }) => { if (!cancelled) setSubscriptions(data || []); });

        return () => { cancelled = true; };
    }, [userId]);

    const persistDismissed = (next: Set<string>) => {
        setDismissed(next);
        try { window.localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
    };

    const alerts = useMemo<Alert[]>(() => {
        const list: Alert[] = [];
        const now = new Date();

        // --- Presupuestos al límite o superados (gasto del mes en curso) ---
        if (budgets) {
            const categoriesMap = categories.reduce((m: Record<string, typeof categories[number]>, c) => ({ ...m, [c.id]: c }), {});
            const spendingMap: Record<string, number> = {};
            transactions.forEach(t => {
                const countsTowardBudget = t.type === 'expense' || t.type === 'transfer';
                if (countsTowardBudget && t.category_id && isSameMonth(parseISO(t.transaction_date), now)) {
                    spendingMap[t.category_id] = (spendingMap[t.category_id] || 0) + t.amount;
                }
            });

            budgets.filter(b => !b.is_savings).forEach(b => {
                const category = categoriesMap[b.category_id];
                if (!category || b.amount <= 0) return;
                const spent = spendingMap[b.category_id] || 0;
                const pct = (spent / b.amount) * 100;
                if (pct >= 100) {
                    list.push({
                        id: `budget-${b.id}`,
                        tone: 'danger',
                        icon: AlertTriangle,
                        title: `${category.name}: presupuesto superado`,
                        subtitle: `${formatCurrency(spent)} de ${formatCurrency(b.amount)} · ${pct.toFixed(0)}%`,
                        href: '/dashboard/presupuestos',
                    });
                } else if (pct >= 80) {
                    list.push({
                        id: `budget-${b.id}`,
                        tone: 'warning',
                        icon: AlertTriangle,
                        title: `${category.name}: cerca del límite`,
                        subtitle: `${formatCurrency(spent)} de ${formatCurrency(b.amount)} · ${pct.toFixed(0)}%`,
                        href: '/dashboard/presupuestos',
                    });
                }
            });
        }

        // --- Suscripciones que cobran en los próximos 3 días ---
        if (subscriptions) {
            subscriptions.forEach(sub => {
                const daysUntil = differenceInDays(parseISO(sub.next_payment_date), now);
                if (daysUntil >= 0 && daysUntil <= 3) {
                    list.push({
                        id: `sub-${sub.id}`,
                        tone: 'warning',
                        icon: CalendarClock,
                        title: `${sub.name} cobra ${daysUntil === 0 ? 'hoy' : `en ${daysUntil}d`}`,
                        subtitle: formatCurrency(Number(sub.amount)),
                        href: '/dashboard/suscripciones',
                    });
                }
            });
        }

        // --- Cuentas en balance negativo ---
        accounts.filter(a => a.current_balance < 0).forEach(a => {
            list.push({
                id: `neg-${a.id}`,
                tone: 'danger',
                icon: TrendingDown,
                title: `${a.name}: balance negativo`,
                subtitle: formatCurrency(a.current_balance),
                href: '/dashboard/cuentas',
            });
        });

        return list.filter(a => !dismissed.has(a.id));
    }, [budgets, subscriptions, accounts, transactions, categories, dismissed]);

    const handleDismiss = (id: string, title: string) => {
        const next = new Set(dismissed);
        next.add(id);
        persistDismissed(next);
        toast.success('Aviso descartado', {
            description: title,
            action: {
                label: 'Deshacer',
                onClick: () => {
                    const restored = new Set(dismissed);
                    restored.delete(id);
                    persistDismissed(restored);
                },
            },
        });
    };

    // `relative` solo envuelve el icono (tamaño fijo w-5 h-5): el badge se posiciona absoluto
    // respecto a ESA caja, nunca respecto al botón, así que no puede desplazar ni descentrar
    // la campana sea cual sea el padding del botón que lo contenga.
    const BellTrigger = (
        <span className="relative flex h-5 w-5 items-center justify-center">
            <Bell className="h-5 w-5" />
            {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold leading-none text-white tabular-nums ring-2 ring-card">
                    {alerts.length > 9 ? '9+' : alerts.length}
                </span>
            )}
        </span>
    );

    const AlertRow = ({ alert }: { alert: Alert }) => (
        <motion.div
            key={alert.id}
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
        >
            <div
                className={cn(
                    'flex items-center gap-3 rounded-xl border p-3',
                    alert.tone === 'danger'
                        ? 'border-accent-500/20 bg-accent-500/5'
                        : 'border-amber-500/20 bg-amber-500/5'
                )}
            >
                <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                    alert.tone === 'danger'
                        ? 'bg-accent-500/15 text-accent-600 dark:text-accent-400'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                )}>
                    <alert.icon className="w-4 h-4" />
                </div>
                <Link href={alert.href} onClick={() => setIsSheetOpen(false)} className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{alert.title}</p>
                    <p className="text-xs text-muted-foreground truncate tabular-nums">{alert.subtitle}</p>
                </Link>
                <button
                    onClick={() => handleDismiss(alert.id, alert.title)}
                    className="shrink-0 p-1.5 -m-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Descartar"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        </motion.div>
    );

    const EmptyState = (
        <div className="py-8 text-center">
            <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Sin avisos por ahora</p>
        </div>
    );

    return (
        <>
            {/* Desktop: popover anclado a la campana */}
            <div className="hidden md:block">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="flex items-center justify-center p-2.5 rounded-xl bg-card border border-border text-muted-foreground hover:bg-muted transition-colors"
                            title="Avisos"
                        >
                            {BellTrigger}
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-96 max-w-[90vw] p-3">
                        <p className="px-1 pb-2 text-sm font-semibold text-foreground">Avisos</p>
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                            {alerts.length === 0 ? EmptyState : (
                                <AnimatePresence initial={false}>
                                    {alerts.map(alert => <AlertRow key={alert.id} alert={alert} />)}
                                </AnimatePresence>
                            )}
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Móvil: Bottom Sheet */}
            <div className="md:hidden">
                <button
                    onClick={() => setIsSheetOpen(true)}
                    className="flex items-center justify-center p-2.5 rounded-xl bg-card border border-border text-muted-foreground hover:bg-muted transition-colors"
                    title="Avisos"
                >
                    {BellTrigger}
                </button>
                <Dialog open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <DialogContent className="w-full sm:max-w-md p-0 gap-0">
                        <DialogHeader className="px-5 py-4 border-b border-border">
                            <DialogTitle>Avisos</DialogTitle>
                        </DialogHeader>
                        <div className="p-4 space-y-2 max-h-[65vh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
                            {alerts.length === 0 ? EmptyState : (
                                <AnimatePresence initial={false}>
                                    {alerts.map(alert => <AlertRow key={alert.id} alert={alert} />)}
                                </AnimatePresence>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}
