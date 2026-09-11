'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, Star, Trash2,
    ChevronLeft, ChevronRight,
    Calendar, Pencil, Database, Loader2
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
import SwipeToDeleteRow from './SwipeToDeleteRow';

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
        <div className="min-h-screen bg-neutral-50 pb-32 md:pb-8">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-neutral-50/80 backdrop-blur-xl border-b border-neutral-100 px-5 py-4">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl hover:bg-neutral-100 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-neutral-700" />
                    </button>
                    <h1 className="text-sm font-semibold text-neutral-900 truncate mx-3">{account.name}</h1>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-500 transition-colors"
                        >
                            <Database className="w-5 h-5" />
                        </button>
                        <button
                            onClick={toggleFavorite}
                            className={`p-2 rounded-xl transition-colors ${isFavorite ? 'text-amber-500' : 'text-neutral-400 hover:bg-neutral-100'}`}
                        >
                            <Star className={`w-5 h-5 ${isFavorite ? 'fill-amber-500' : ''}`} />
                        </button>
                        <button
                            onClick={handleCancelAccount}
                            disabled={isDeleting}
                            className="p-2 rounded-xl hover:bg-rose-50 text-rose-500 transition-colors"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-5 space-y-5 max-w-4xl mx-auto pt-5">
                {/* Account Card */}
                <div
                    className="relative overflow-hidden rounded-2xl p-5 text-white"
                    style={{ backgroundColor: themeColor }}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center overflow-hidden">
                                {account.banks?.logo_url ? (
                                    <img src={account.banks.logo_url} alt="" className="w-10 h-10 object-contain" />
                                ) : (
                                    <span className="text-lg font-bold">{account.banks?.name?.substring(0, 2).toUpperCase() || '€'}</span>
                                )}
                            </div>
                            <div>
                                <p className="text-white/70 text-xs font-medium">{account.banks?.name || 'Cuenta'}</p>
                                <p className="font-semibold">{account.name}</p>
                            </div>
                        </div>
                        <p className="text-3xl font-bold font-mono tracking-tight">
                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(account.current_balance)}
                        </p>
                    </div>
                </div>

                {/* Date Controls */}
                <div className="flex items-center justify-between bg-white rounded-xl p-2 border border-neutral-100">
                    {!showAllDates && (
                        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-neutral-100 rounded-lg shrink-0">
                            <ChevronLeft className="w-4 h-4 text-neutral-600" />
                        </button>
                    )}
                    <button
                        onClick={() => setShowAllDates(!showAllDates)}
                        className="flex-1 text-center py-2 hover:bg-neutral-50 rounded-lg transition-colors min-w-0"
                    >
                        <div className="flex items-center justify-center gap-2">
                            {loadingMonth ? <Loader2 className="w-4 h-4 text-neutral-400 shrink-0 animate-spin" /> : <Calendar className="w-4 h-4 text-neutral-400 shrink-0" />}
                            <span className="text-sm font-medium text-neutral-700 capitalize truncate">
                                {showAllDates ? 'Todo el historial' : format(currentMonth, 'MMMM yyyy', { locale: es })}
                            </span>
                        </div>
                    </button>
                    {!showAllDates && (
                        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-neutral-100 rounded-lg shrink-0">
                            <ChevronRight className="w-4 h-4 text-neutral-600" />
                        </button>
                    )}
                </div>

                {/* Stats Summary */}
                {!showAllDates && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
                            <p className="text-[10px] text-emerald-600 font-semibold uppercase">Ingresos</p>
                            <p className="text-base font-bold text-emerald-700 font-mono">+{new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(monthIncome)}€</p>
                        </div>
                        <div className="bg-rose-50 rounded-xl p-3 text-center border border-rose-100">
                            <p className="text-[10px] text-rose-600 font-semibold uppercase">Gastos</p>
                            <p className="text-base font-bold text-rose-700 font-mono">-{new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(monthExpense)}€</p>
                        </div>
                        <div className="bg-neutral-100 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-neutral-500 font-semibold uppercase">Balance</p>
                            <p className={`text-base font-bold font-mono ${monthIncome - monthExpense >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {monthIncome - monthExpense >= 0 ? '+' : ''}{new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(monthIncome - monthExpense)}€
                            </p>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                            <p className="text-[10px] text-blue-600 font-semibold uppercase">Transferencias</p>
                            <p className="text-xs font-bold text-blue-700 font-mono">+{new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(monthTransferIn)}€ / -{new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(monthTransferOut)}€</p>
                        </div>
                    </div>
                )}

                {/* Filters - scrollable on mobile, no overflow */}
                <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 md:mx-0 md:px-0">
                    {filterButtons.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilterType(f.key)}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                                filterType === f.key
                                    ? 'bg-neutral-900 text-white'
                                    : 'bg-white border border-neutral-200 text-neutral-500'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Transaction List */}
                <div className="space-y-5">
                    {showAllDates && loadingHistory && allHistory === null ? (
                        <div className="text-center py-16 bg-white rounded-xl border border-neutral-100">
                            <Loader2 className="w-5 h-5 text-neutral-300 animate-spin mx-auto mb-2" />
                            <p className="text-neutral-400 text-sm">Cargando historial...</p>
                        </div>
                    ) : Object.keys(groupedTransactions).length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-xl border border-neutral-100">
                            <p className="text-neutral-400 text-sm">Sin movimientos en este período</p>
                            {!showAllDates && (
                                <button onClick={() => setShowAllDates(true)} className="mt-3 px-4 py-2 bg-neutral-900 text-white rounded-xl text-sm font-medium">
                                    Ver todo
                                </button>
                            )}
                        </div>
                    ) : (
                        Object.entries(groupedTransactions).sort((a, b) => b[0].localeCompare(a[0])).map(([date, txs]) => (
                            <div key={date}>
                                <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2 ml-1">
                                    {isSameDay(parseISO(date), new Date()) ? 'Hoy' : format(parseISO(date), 'd MMMM', { locale: es })}
                                </h4>
                                <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden divide-y divide-neutral-50">
                                    {txs.map(t => {
                                        const rowKey = `${t.id}-${t.isIncomingTransfer ? 'in' : 'out'}`;
                                        const categoryName = t.categories?.name || t.category || (t.type === 'transfer' ? 'Transferencia' : 'General');
                                        const icon = t.categories?.icon;
                                        const isTransfer = t.type === 'transfer';
                                        const isIncoming = t.isIncomingTransfer;
                                        const showAsIncome = t.type === 'income' || isIncoming;

                                        return (
                                            <SwipeToDeleteRow key={rowKey} onDelete={() => handleDeleteTransaction(t)} disabled={deletingId === t.id} className="bg-white px-4 py-3 flex items-center gap-3 group">
                                                <div
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                                    style={{ backgroundColor: t.categories?.color ? `${t.categories.color}15` : (isTransfer ? '#f0f9ff' : '#f5f5f5') }}
                                                >
                                                    <CategoryIcon
                                                        name={icon || (isTransfer ? (isIncoming ? 'up' : 'down') : (t.type === 'expense' ? 'down' : 'up'))}
                                                        className="w-5 h-5"
                                                        style={{ color: t.categories?.color || (isTransfer ? '#3b82f6' : (t.type === 'expense' ? '#f43f5e' : '#10b981')) }}
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-neutral-900 text-sm truncate">{categoryName}</p>
                                                    <p className="text-xs text-neutral-400 truncate">
                                                        {isTransfer ? (isIncoming ? 'Transferencia recibida' : 'Transferencia enviada') : t.description || 'Sin descripción'}
                                                    </p>
                                                </div>
                                                <p className={`font-semibold text-sm font-mono shrink-0 ${
                                                    isTransfer ? 'text-blue-600' : (showAsIncome ? 'text-emerald-600' : 'text-neutral-900')
                                                }`}>
                                                    {showAsIncome ? '+' : '-'}{new Intl.NumberFormat('es-ES').format(t.amount)}€
                                                </p>
                                                <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setEditingTransaction(t)}
                                                        className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteTransaction(t)}
                                                        disabled={deletingId === t.id}
                                                        className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                                                    >
                                                        {deletingId === t.id ? (
                                                            <div className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                </div>
                                            </SwipeToDeleteRow>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}

                    {showAllDates && allHistory !== null && allHistoryHasMore && (
                        <button
                            onClick={loadMoreHistory}
                            disabled={loadingHistory}
                            className="w-full py-3 bg-white border border-neutral-100 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2"
                        >
                            {loadingHistory ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            Cargar más
                        </button>
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
