'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, Star, Trash2,
    ChevronLeft, ChevronRight,
    ArrowDownRight, ArrowUpRight, Calendar, Pencil, Database
} from 'lucide-react';
import { format, parseISO, isSameDay, isSameMonth, subMonths, addMonths, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/client';
import { cancelAccount } from '@/lib/actions/accounts';
import EditTransactionModal from './EditTransactionModal';
import ImportTransactionsModal from './ImportTransactionsModal';

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
    description: string;
    transaction_date: string;
    category_id?: string;
    account_id: string;
    categories?: Category;
    category?: string;
    isIncomingTransfer?: boolean;
    original_account_id?: string;
    related_account_id?: string;
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
};

export default function AccountDetailView({ account, initialTransactions, categories }: Props) {
    const router = useRouter();
    const supabase = createClient();
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

    const [currentMonth, setCurrentMonth] = useState(() => {
        if (initialTransactions && initialTransactions.length > 0) {
            const latest = initialTransactions.reduce((l, c) =>
                new Date(l.transaction_date) > new Date(c.transaction_date) ? l : c
            );
            const d = parseISO(latest.transaction_date);
            return isValid(d) ? d : new Date();
        }
        return new Date();
    });

    const [isFavorite, setIsFavorite] = useState(account.is_favorite);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showAllDates, setShowAllDates] = useState(true);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const themeColor = account.banks?.color || '#1a1a1a';

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
            alert('Error al cancelar la cuenta');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteTransaction = async (tx: Transaction) => {
        if (!confirm('¿Eliminar esta transacción?')) return;
        setDeletingId(tx.id);
        try {
            await supabase.from('transactions').delete().eq('id', tx.id);
            const { data: acc } = await supabase.from('accounts').select('current_balance').eq('id', tx.account_id).single();
            if (acc) {
                const newBalance = tx.type === 'income' ? acc.current_balance - tx.amount : acc.current_balance + tx.amount;
                await supabase.from('accounts').update({ current_balance: newBalance }).eq('id', tx.account_id);
            }
            router.refresh();
        } catch {
            alert('Error al eliminar');
        } finally {
            setDeletingId(null);
        }
    };

    const handleEditSaved = () => {
        setEditingTransaction(null);
        router.refresh();
    };

    const parsedTransactions = useMemo(() => {
        return initialTransactions.map(t => {
            let date = parseISO(t.transaction_date);
            if (!isValid(date)) date = new Date(t.transaction_date);
            return { ...t, parsedDate: date };
        });
    }, [initialTransactions]);

    const filteredTransactions = useMemo(() => {
        return parsedTransactions.filter(t => {
            if (!isValid(t.parsedDate)) return false;
            if (!showAllDates && !isSameMonth(t.parsedDate, currentMonth)) return false;
            if (filterType !== 'all' && t.type !== filterType) return false;
            return true;
        });
    }, [parsedTransactions, filterType, currentMonth, showAllDates]);

    const { monthIncome, monthExpense } = useMemo(() => {
        let inc = 0, exp = 0;
        filteredTransactions.forEach(t => {
            if (t.type === 'income') inc += t.amount;
            else exp += t.amount;
        });
        return { monthIncome: inc, monthExpense: exp };
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

    return (
        <div className="min-h-screen bg-neutral-50 pb-32">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-neutral-50/80 backdrop-blur-xl px-5 py-4">
                <div className="flex items-center justify-between">
                    <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl hover:bg-neutral-100 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-neutral-700" />
                    </button>
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

            <div className="px-5 space-y-5">
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
                        <p className="text-3xl font-bold">
                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(account.current_balance)}
                        </p>
                    </div>
                </div>

                {/* Date Controls */}
                <div className="flex items-center justify-between bg-white rounded-xl p-2 border border-neutral-100">
                    {!showAllDates && (
                        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-neutral-100 rounded-lg">
                            <ChevronLeft className="w-4 h-4 text-neutral-600" />
                        </button>
                    )}
                    <button
                        onClick={() => setShowAllDates(!showAllDates)}
                        className="flex-1 text-center py-2 hover:bg-neutral-50 rounded-lg transition-colors"
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Calendar className="w-4 h-4 text-neutral-400" />
                            <span className="text-sm font-medium text-neutral-700 capitalize">
                                {showAllDates ? 'Todo el historial' : format(currentMonth, 'MMMM yyyy', { locale: es })}
                            </span>
                        </div>
                    </button>
                    {!showAllDates && (
                        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-neutral-100 rounded-lg">
                            <ChevronRight className="w-4 h-4 text-neutral-600" />
                        </button>
                    )}
                </div>

                {/* Stats Summary */}
                {!showAllDates && (
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
                            <p className="text-[10px] text-emerald-600 font-semibold uppercase">Ingresos</p>
                            <p className="text-base font-bold text-emerald-700">+{new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(monthIncome)}€</p>
                        </div>
                        <div className="bg-rose-50 rounded-xl p-3 text-center border border-rose-100">
                            <p className="text-[10px] text-rose-600 font-semibold uppercase">Gastos</p>
                            <p className="text-base font-bold text-rose-700">-{new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(monthExpense)}€</p>
                        </div>
                        <div className="bg-neutral-100 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-neutral-500 font-semibold uppercase">Balance</p>
                            <p className={`text-base font-bold ${monthIncome - monthExpense >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {monthIncome - monthExpense >= 0 ? '+' : ''}{new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(monthIncome - monthExpense)}€
                            </p>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="flex gap-2">
                    {(['all', 'income', 'expense'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setFilterType(t)}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                                filterType === t 
                                    ? 'bg-neutral-900 text-white' 
                                    : 'bg-white border border-neutral-200 text-neutral-500'
                            }`}
                        >
                            {t === 'all' ? 'Todos' : t === 'income' ? 'Ingresos' : 'Gastos'}
                        </button>
                    ))}
                </div>

                {/* Transaction List */}
                <div className="space-y-5">
                    {Object.keys(groupedTransactions).length === 0 ? (
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
                                        const categoryName = t.categories?.name || t.category || 'General';
                                        const icon = t.categories?.icon;
                                        
                                        // Transferencias: entrantes = ingreso, salientes = gasto
                                        const isTransfer = t.type === 'transfer';
                                        const isIncoming = t.isIncomingTransfer;
                                        
                                        // Determinar si es ingreso para mostrar el signo correcto
                                        const showAsIncome = t.type === 'income' || isIncoming;

                                        return (
                                            <div key={t.id} className="px-4 py-3 flex items-center gap-3 group">
                                                <div
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
                                                    style={{ backgroundColor: t.categories?.color ? `${t.categories.color}15` : (isTransfer ? '#f0f9ff' : '#f5f5f5') }}
                                                >
                                                    {icon || (
                                                        isTransfer 
                                                            ? (isIncoming 
                                                                ? <ArrowDownRight className="w-4 h-4 text-blue-500" /> 
                                                                : <ArrowUpRight className="w-4 h-4 text-blue-500" />)
                                                            : (t.type === 'expense' 
                                                                ? <ArrowDownRight className="w-4 h-4 text-rose-500" /> 
                                                                : <ArrowUpRight className="w-4 h-4 text-emerald-500" />)
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-neutral-900 text-sm truncate">
                                                        {isTransfer ? (isIncoming ? 'Transferencia recibida' : 'Transferencia enviada') : categoryName}
                                                    </p>
                                                    {t.description && (
                                                        <p className="text-xs text-neutral-400 truncate">{t.description}</p>
                                                    )}
                                                </div>
                                                <p className={`font-semibold text-sm ${
                                                    isTransfer 
                                                        ? 'text-blue-600' 
                                                        : (showAsIncome ? 'text-emerald-600' : 'text-neutral-900')
                                                }`}>
                                                    {showAsIncome ? '+' : '-'}{new Intl.NumberFormat('es-ES').format(t.amount)}€
                                                </p>
                                                {!isTransfer && (
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => setEditingTransaction(t)}
                                                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteTransaction(t)}
                                                            disabled={deletingId === t.id}
                                                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                                                        >
                                                            {deletingId === t.id ? (
                                                                <div className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            {editingTransaction && (
                <EditTransactionModal
                    transaction={editingTransaction}
                    categories={categories}
                    accounts={[{ id: account.id, name: account.name, current_balance: account.current_balance }]}
                    onClose={() => setEditingTransaction(null)}
                    onSaved={handleEditSaved}
                />
            )}

            {/* Import Modal */}
            {isImportModalOpen && (
                <ImportTransactionsModal
                    accounts={[{ id: account.id, name: account.name }]}
                    categories={categories}
                    onClose={() => setIsImportModalOpen(false)}
                    onImportSuccess={() => {
                        setIsImportModalOpen(false);
                        router.refresh();
                    }}
                />
            )}
        </div>
    );
}
