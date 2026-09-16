'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, Star, Trash2,
    ChevronLeft, ChevronRight,
    Calendar, Database, Loader2
} from 'lucide-react';
import { format, parseISO, isSameDay, subMonths, addMonths, isValid, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cancelAccount } from '@/lib/actions/accounts';
import { deleteTransfer } from '@/lib/actions/transfers';
import CategoryIcon from '@/components/ui/CategoryIcon';
import EditTransactionModal from './EditTransactionModal';
import EditTransferModal from './EditTransferModal';
import ImportTransactionsModal from './ImportTransactionsModal';
import SwipeActionRow from './SwipeActionRow';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';

type Category = {
    id: string;
    name: string;
    icon?: string;
    color?: string;
};

type Transaction = {
    id: string;
    amount: number;
    type: string;
    description?: string;
    transaction_date: string;
    category_id?: string;
    account_id: string;
    categories?: Category | null;
    category?: string;
    isIncomingTransfer?: boolean;
    related_account_id?: string | null;
};

type Account = {
    id: string;
    name: string;
    type: string;
    current_balance: number;
    is_favorite: boolean;
    banks?: {
        id?: string;
        name: string;
        color: string;
        logo_url?: string;
    } | null;
};

type Props = {
    account: Account;
    initialTransactions: Transaction[];
    categories: Category[];
    accounts: Account[];
};

const HISTORY_PAGE_SIZE = 100;

/** "Categoría · Concepto" — combina categoría y título en una sola línea legible. */
function categoryAndTitle(categoryName: string, description?: string) {
    const title = description?.trim();
    return title && title.toLowerCase() !== categoryName.toLowerCase()
        ? `${categoryName} · ${title}`
        : categoryName;
}

export default function AccountDetailView({ account, initialTransactions, categories, accounts }: Props) {
    const router = useRouter();
    const supabase = createClient();
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');

    // initialTransactions viene ya acotado al mes actual desde el servidor (carga ligera).
    // El resto de meses y "todo el historial" se piden bajo demanda aquí.
    const [currentMonth, setCurrentMonth] = useState(() => new Date());
    const currentMonthKey = format(currentMonth, 'yyyy-MM');
    const [monthCache, setMonthCache] = useState<Record<string, Transaction[]>>(() => ({
        [format(new Date(), 'yyyy-MM')]: initialTransactions,
    }));
    const [loadingMonth, setLoadingMonth] = useState(false);

    const [showAllDates, setShowAllDates] = useState(false);
    const [allHistory, setAllHistory] = useState<Transaction[] | null>(null);
    const [allHistoryHasMore, setAllHistoryHasMore] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const [isFavorite, setIsFavorite] = useState(account.is_favorite);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const themeColor = account.banks?.color || '#1a1a1a';

    // Trae transacciones (normales + transferencias entrantes) de esta cuenta en un rango o página,
    // combinadas igual que hace el servidor al cargar la página.
    const fetchTransactionsBatch = async (opts: { start?: string; end?: string; before?: string; limit: number }) => {
        let outQ = supabase.from('transactions').select('*, categories(id, name, icon, color)')
            .eq('account_id', account.id).order('transaction_date', { ascending: false }).limit(opts.limit);
        let inQ = supabase.from('transactions').select('*, categories(id, name, icon, color)')
            .eq('related_account_id', account.id).eq('type', 'transfer').order('transaction_date', { ascending: false }).limit(opts.limit);

        if (opts.start) { outQ = outQ.gte('transaction_date', opts.start); inQ = inQ.gte('transaction_date', opts.start); }
        if (opts.end) { outQ = outQ.lte('transaction_date', opts.end); inQ = inQ.lte('transaction_date', opts.end); }
        if (opts.before) { outQ = outQ.lt('transaction_date', opts.before); inQ = inQ.lt('transaction_date', opts.before); }

        const [{ data: out }, { data: inc }] = await Promise.all([outQ, inQ]);
        const incoming = (inc || []).map((t: any) => ({ ...t, isIncomingTransfer: true }));
        return [...(out || []), ...incoming].sort((a: any, b: any) =>
            new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
        ) as Transaction[];
    };

    // Cargar el mes al que se navega si no está ya en caché
    useEffect(() => {
        if (showAllDates || monthCache[currentMonthKey]) return;
        let cancelled = false;
        setLoadingMonth(true);
        fetchTransactionsBatch({
            start: format(startOfMonth(currentMonth), 'yyyy-MM-dd'),
            end: format(endOfMonth(currentMonth), 'yyyy-MM-dd'),
            limit: 1000,
        }).then(data => {
            if (cancelled) return;
            setMonthCache(prev => ({ ...prev, [currentMonthKey]: data }));
        }).finally(() => { if (!cancelled) setLoadingMonth(false); });
        return () => { cancelled = true; };
    }, [currentMonthKey, showAllDates]);

    // Cargar la primera página de "todo el historial" la primera vez que se activa
    useEffect(() => {
        if (!showAllDates || allHistory !== null) return;
        setLoadingHistory(true);
        fetchTransactionsBatch({ limit: HISTORY_PAGE_SIZE }).then(data => {
            setAllHistory(data);
            setAllHistoryHasMore(data.length >= HISTORY_PAGE_SIZE);
        }).finally(() => setLoadingHistory(false));
    }, [showAllDates]);

    // Cuando el servidor manda transacciones frescas del mes actual (tras un router.refresh()
    // por crear/editar/borrar algo), sincronizamos la caché en vez de dejarla desactualizada.
    useEffect(() => {
        setMonthCache(prev => ({ ...prev, [format(new Date(), 'yyyy-MM')]: initialTransactions }));
    }, [initialTransactions]);

    // Invalida cachés que puedan haber quedado obsoletas tras editar/borrar/crear algo,
    // para que se vuelvan a pedir la próxima vez que se visiten.
    const invalidateStaleCaches = () => {
        setAllHistory(null);
        setMonthCache(prev => {
            const currentKey = format(new Date(), 'yyyy-MM');
            return currentKey in prev ? { [currentKey]: prev[currentKey] } : {};
        });
    };

    const loadMoreHistory = async () => {
        if (!allHistory || allHistory.length === 0) return;
        setLoadingHistory(true);
        try {
            const cursor = allHistory[allHistory.length - 1].transaction_date;
            const more = await fetchTransactionsBatch({ before: cursor, limit: HISTORY_PAGE_SIZE });
            setAllHistory(prev => [...(prev || []), ...more]);
            setAllHistoryHasMore(more.length >= HISTORY_PAGE_SIZE);
        } finally {
            setLoadingHistory(false);
        }
    };

    const toggleFavorite = async () => {
        const newValue = !isFavorite;
        setIsFavorite(newValue);
        const { error } = await supabase.from('accounts').update({ is_favorite: newValue }).eq('id', account.id);
        if (error) {
            setIsFavorite(!newValue);
        } else {
            router.refresh();
        }
    };

    const handleCancelAccount = async () => {
        if (!confirm('¿Deseas cancelar esta cuenta? Se mantendrá el historial de transacciones para auditoría.')) return;
        setIsDeleting(true);
        try {
            await cancelAccount(account.id);
            router.push('/dashboard/cuentas');
            router.refresh();
        } catch {
            toast.error('Error al cancelar la cuenta');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteTransaction = async (tx: Transaction) => {
        if (!confirm('¿Eliminar esta transacción?')) return;
        setDeletingId(tx.id);
        try {
            if (tx.type === 'transfer') {
                const result = await deleteTransfer(tx.id);
                if (result.error) throw new Error(result.error);
            } else {
                await supabase.from('transactions').delete().eq('id', tx.id);
            }
            toast.success('Transacción eliminada');
            invalidateStaleCaches();
            router.refresh();
        } catch {
            toast.error('Error al eliminar');
        } finally {
            setDeletingId(null);
        }
    };

    const handleEditSaved = () => {
        setEditingTransaction(null);
        invalidateStaleCaches();
        router.refresh();
    };

    const sourceTransactions = useMemo(() => {
        if (showAllDates) return allHistory || [];
        return monthCache[currentMonthKey] || [];
    }, [showAllDates, allHistory, monthCache, currentMonthKey]);

    const parsedTransactions = useMemo(() => {
        return sourceTransactions.map(t => {
            let date = parseISO(t.transaction_date);
            if (!isValid(date)) date = new Date(t.transaction_date);
            return { ...t, parsedDate: date };
        });
    }, [sourceTransactions]);

    const filteredTransactions = useMemo(() => {
        return parsedTransactions.filter(t => {
            if (!isValid(t.parsedDate)) return false;
            if (filterType !== 'all' && t.type !== filterType) return false;
            return true;
        });
    }, [parsedTransactions, filterType]);

    const { monthIncome, monthExpense, monthTransferIn, monthTransferOut } = useMemo(() => {
        let inc = 0, exp = 0, transferIn = 0, transferOut = 0;
        filteredTransactions.forEach(t => {
            if (t.type === 'income') inc += t.amount;
            else if (t.type === 'expense') exp += t.amount;
            else if (t.type === 'transfer') {
                if (t.isIncomingTransfer) transferIn += t.amount;
                else transferOut += t.amount;
            }
        });
        return { monthIncome: inc, monthExpense: exp, monthTransferIn: transferIn, monthTransferOut: transferOut };
    }, [filteredTransactions]);

    const groupedTransactions = useMemo(() => {
        const grouped: Record<string, typeof parsedTransactions[0][]> = {};
        filteredTransactions.forEach(t => {
            const dateKey = format(t.parsedDate, 'yyyy-MM-dd');
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(t);
        });
        return grouped;
    }, [filteredTransactions]);

    const filterButtons = [
        { key: 'all' as const, label: 'Todos' },
        { key: 'income' as const, label: 'Ingresos' },
        { key: 'expense' as const, label: 'Gastos' },
        { key: 'transfer' as const, label: 'Transf.' },
    ];

    return (
        <div className="min-h-screen bg-background pb-32 md:pb-8">
            {/* Header */}
            <div className="sticky top-0 z-20 glass-nav border-b px-5 py-4">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-sm font-semibold text-foreground truncate mx-3">{account.name}</h1>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Database className="w-5 h-5" />
                        </button>
                        <button
                            onClick={toggleFavorite}
                            className={`p-2 rounded-xl transition-colors ${isFavorite ? 'text-amber-500' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                        >
                            <Star className={`w-5 h-5 ${isFavorite ? 'fill-amber-500' : ''}`} />
                        </button>
                        <button
                            onClick={handleCancelAccount}
                            disabled={isDeleting}
                            className="p-2 rounded-xl hover:bg-destructive/10 text-destructive transition-colors"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-5 space-y-4 max-w-4xl mx-auto pt-5">
                {/* Card compacta: balance + mini-badges + resplandor ambiental del color de cuenta */}
                <div className="bg-card border border-border/50 relative overflow-hidden rounded-2xl p-4">
                    <div
                        className="pointer-events-none absolute inset-0 opacity-[0.08] dark:opacity-[0.14]"
                        style={{ backgroundImage: `linear-gradient(to bottom right, ${themeColor}, transparent 70%)` }}
                    />
                    <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <div
                                className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl"
                                style={{ backgroundColor: `${themeColor}1A`, color: themeColor }}
                            >
                                {account.banks?.logo_url ? (
                                    <img src={account.banks.logo_url} alt="" className="h-8 w-8 object-contain" />
                                ) : (
                                    <span className="text-sm font-bold">{account.banks?.name?.substring(0, 2).toUpperCase() || '€'}</span>
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-xs font-medium text-muted-foreground">{account.banks?.name || 'Cuenta'}</p>
                                <p className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
                                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(account.current_balance)}
                                </p>
                            </div>
                        </div>

                        {!showAllDates && (
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 rounded-full bg-secondary-500/10 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-secondary-600 dark:text-secondary-400">
                                    +{new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(monthIncome)}€
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-accent-500/10 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-accent-600 dark:text-accent-400">
                                    -{new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(monthExpense)}€
                                </span>
                                {(monthTransferIn > 0 || monthTransferOut > 0) && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-primary">
                                        ⇄ +{new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(monthTransferIn)}€ / -{new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(monthTransferOut)}€
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Selector de fecha compacto tipo pill */}
                <div className="flex items-center justify-center gap-1">
                    {!showAllDates && (
                        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                    )}
                    <button
                        onClick={() => setShowAllDates(!showAllDates)}
                        className="min-w-0 rounded-full border border-border bg-card px-4 py-1.5 transition-colors hover:bg-muted"
                    >
                        <div className="flex items-center justify-center gap-1.5">
                            {loadingMonth ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" /> : <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                            <span className="truncate text-xs font-semibold capitalize text-foreground">
                                {showAllDates ? 'Todo el historial' : format(currentMonth, 'MMMM yyyy', { locale: es })}
                            </span>
                        </div>
                    </button>
                    {!showAllDates && (
                        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Filters - scrollable on mobile, no overflow */}
                <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 md:mx-0 md:px-0">
                    {filterButtons.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilterType(f.key)}
                            className={cn(
                                'px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all',
                                filterType === f.key
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Transaction List */}
                <div className="space-y-5">
                    {showAllDates && loadingHistory && allHistory === null ? (
                        <div className="text-center py-16 bg-card rounded-xl border border-border">
                            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin mx-auto mb-2" />
                            <p className="text-muted-foreground text-sm">Cargando historial...</p>
                        </div>
                    ) : Object.keys(groupedTransactions).length === 0 ? (
                        <div className="text-center py-16 bg-card rounded-xl border border-border">
                            <p className="text-muted-foreground text-sm">Sin movimientos en este período</p>
                            {!showAllDates && (
                                <Button onClick={() => setShowAllDates(true)} className="mt-3" size="sm">
                                    Ver todo
                                </Button>
                            )}
                        </div>
                    ) : (
                        Object.entries(groupedTransactions).sort((a, b) => b[0].localeCompare(a[0])).map(([date, txs]) => (
                            <div key={date}>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 ml-1">
                                    {isSameDay(parseISO(date), new Date()) ? 'Hoy' : format(parseISO(date), 'd MMMM', { locale: es })}
                                </h4>
                                <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
                                    {txs.map(t => {
                                        const rowKey = `${t.id}-${t.isIncomingTransfer ? 'in' : 'out'}`;
                                        const categoryName = t.categories?.name || t.category || (t.type === 'transfer' ? 'Transferencia' : 'General');
                                        const icon = t.categories?.icon;
                                        const isTransfer = t.type === 'transfer';
                                        const isIncoming = t.isIncomingTransfer;
                                        const showAsIncome = t.type === 'income' || isIncoming;

                                        return (
                                            <SwipeActionRow
                                                key={rowKey}
                                                onEdit={() => setEditingTransaction(t)}
                                                onDelete={() => handleDeleteTransaction(t)}
                                                disabled={deletingId === t.id}
                                                className="bg-card px-4 py-3 flex items-center gap-3"
                                            >
                                                <div
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                                    style={{ backgroundColor: t.categories?.color ? `${t.categories.color}15` : (isTransfer ? '#4f46e515' : 'var(--muted)') }}
                                                >
                                                    <CategoryIcon
                                                        name={icon || (isTransfer ? (isIncoming ? 'up' : 'down') : (t.type === 'expense' ? 'down' : 'up'))}
                                                        className="w-5 h-5"
                                                        style={{ color: t.categories?.color || (isTransfer ? 'var(--primary)' : (t.type === 'expense' ? '#e11d48' : '#10b981')) }}
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-foreground text-sm truncate">
                                                        {isTransfer ? categoryName : categoryAndTitle(categoryName, t.description)}
                                                    </p>
                                                    {isTransfer && (
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            {isIncoming ? 'Transferencia recibida' : 'Transferencia enviada'}
                                                        </p>
                                                    )}
                                                </div>
                                                <p className={`font-semibold text-sm tabular-nums shrink-0 ${
                                                    isTransfer ? 'text-primary' : (showAsIncome ? 'text-secondary-600 dark:text-secondary-400' : 'text-accent-600 dark:text-accent-400')
                                                }`}>
                                                    {showAsIncome ? '+' : '-'}{formatCurrency(t.amount)}
                                                </p>
                                            </SwipeActionRow>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}

                    {showAllDates && allHistory !== null && allHistoryHasMore && (
                        <Button
                            variant="outline"
                            onClick={loadMoreHistory}
                            disabled={loadingHistory}
                            className="w-full"
                        >
                            {loadingHistory ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            Cargar más
                        </Button>
                    )}
                </div>
            </div>

            {editingTransaction && editingTransaction.type === 'transfer' ? (
                <EditTransferModal
                    transaction={editingTransaction as any}
                    categories={categories}
                    accounts={accounts}
                    onClose={() => setEditingTransaction(null)}
                    onSaved={handleEditSaved}
                />
            ) : editingTransaction && (
                <EditTransactionModal
                    transaction={editingTransaction}
                    categories={categories}
                    accounts={[{ id: account.id, name: account.name, current_balance: account.current_balance }]}
                    onClose={() => setEditingTransaction(null)}
                    onSaved={handleEditSaved}
                />
            )}

            {isImportModalOpen && (
                <ImportTransactionsModal
                    accounts={[{ id: account.id, name: account.name }]}
                    allAccounts={accounts.map(a => ({ id: a.id, name: a.name }))}
                    categories={categories}
                    onClose={() => setIsImportModalOpen(false)}
                    onImportSuccess={() => {
                        setIsImportModalOpen(false);
                        invalidateStaleCaches();
                        router.refresh();
                    }}
                />
            )}
        </div>
    );
}
