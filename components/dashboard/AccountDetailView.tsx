'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, Star, Pencil, Trash2,
    ChevronLeft, ChevronRight,
    ArrowDownRight, ArrowUpRight, Calendar
} from 'lucide-react';
import { format, parseISO, isSameDay, isSameMonth, subMonths, addMonths, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/client';
import { cancelAccount } from '@/lib/actions/accounts';
import EditTransactionModal from './EditTransactionModal';
import ImportTransactionsModal from './ImportTransactionsModal';
import { Database } from 'lucide-react';

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
        <div className="min-h-screen bg-neutral-50 pb-40">
            {/* Header */}
            <div className="bg-white sticky top-0 z-20 px-4 py-3 flex items-center justify-between border-b border-neutral-100">
                <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-neutral-100 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-neutral-700" />
                </button>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-600 transition-colors"
                        title="Importar transacciones"
                    >
                        <Database className="w-5 h-5" />
                    </button>
                    <button
                        onClick={toggleFavorite}
                        className={`p-2 rounded-xl transition-colors ${isFavorite ? 'bg-amber-100 text-amber-600' : 'hover:bg-neutral-100 text-neutral-400'}`}
                    >
                        <Star className={`w-5 h-5 ${isFavorite ? 'fill-amber-500' : ''}`} />
                    </button>
                    <button
                        onClick={handleCancelAccount}
                        disabled={isDeleting}
                        className="p-2 rounded-xl hover:bg-red-50 text-red-500 transition-colors"
                        title="Cancelar cuenta"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="container mx-auto px-4 pt-5 max-w-2xl">
                {/* Account Card with Bank Branding */}
                <div
                    className="relative overflow-hidden rounded-3xl p-6 mb-5 text-white shadow-2xl"
                    style={{ background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}dd 100%)` }}
                >
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10 flex items-center gap-5">
                        {/* Bank Logo */}
                        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden shrink-0 border border-white/10">
                            {account.banks?.logo_url ? (
                                <img src={account.banks.logo_url} alt={account.banks.name} className="w-12 h-12 object-contain" />
                            ) : (
                                <span className="text-2xl font-black text-white/90">
                                    {account.banks?.name?.substring(0, 2).toUpperCase() || '€'}
                                </span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold tracking-wider uppercase opacity-70 mb-1">
                                {account.banks?.name || 'Cuenta Personal'}
                            </p>
                            <h2 className="text-3xl font-black tracking-tight">
                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(account.current_balance)}
                            </h2>
                        </div>
                    </div>
                </div>

                {/* Date Controls */}
                <div className="bg-white rounded-2xl p-3 shadow-sm border border-neutral-100 mb-5 flex items-center justify-between">
                    {!showAllDates && (
                        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="w-10 h-10 flex items-center justify-center hover:bg-neutral-100 rounded-xl text-neutral-600">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    )}
                    <button
                        onClick={() => setShowAllDates(!showAllDates)}
                        className="flex-1 text-center hover:bg-neutral-50 rounded-xl py-2 transition-colors mx-2"
                    >
                        <h3 className="text-sm font-bold text-neutral-900 capitalize flex items-center justify-center gap-2">
                            <Calendar className="w-4 h-4 text-neutral-400" />
                            {showAllDates ? 'Todo el Historial' : format(currentMonth, 'MMMM yyyy', { locale: es })}
                        </h3>
                        <p className="text-xs text-neutral-400">
                            {showAllDates ? 'Toca para filtrar por mes' : 'Toca para ver todo'}
                        </p>
                    </button>
                    {!showAllDates && (
                        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="w-10 h-10 flex items-center justify-center hover:bg-neutral-100 rounded-xl text-neutral-600">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Stats Summary */}
                {!showAllDates && (
                    <div className="grid grid-cols-3 gap-3 mb-5">
                        <div className="bg-emerald-50 rounded-2xl p-4 text-center border border-emerald-100">
                            <p className="text-xs text-emerald-600 font-bold uppercase">Ingresos</p>
                            <p className="text-lg font-black text-emerald-700">+{new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(monthIncome)}</p>
                        </div>
                        <div className="bg-rose-50 rounded-2xl p-4 text-center border border-rose-100">
                            <p className="text-xs text-rose-600 font-bold uppercase">Gastos</p>
                            <p className="text-lg font-black text-rose-700">-{new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(monthExpense)}</p>
                        </div>
                        <div className="bg-neutral-100 rounded-2xl p-4 text-center">
                            <p className="text-xs text-neutral-600 font-bold uppercase">Balance</p>
                            <p className={`text-lg font-black ${monthIncome - monthExpense >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {monthIncome - monthExpense >= 0 ? '+' : ''}{new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(monthIncome - monthExpense)}
                            </p>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide">
                    {(['all', 'income', 'expense'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setFilterType(t)}
                            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${filterType === t ? 'bg-neutral-900 text-white shadow-lg' : 'bg-white border border-neutral-200 text-neutral-500'
                                }`}
                        >
                            {t === 'all' ? 'Todos' : t === 'income' ? 'Ingresos' : 'Gastos'}
                        </button>
                    ))}
                </div>

                {/* Transaction List */}
                <div className="space-y-6 pb-32">
                    {Object.keys(groupedTransactions).length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-neutral-200">
                            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🕵️</div>
                            <h3 className="text-neutral-900 font-bold mb-2">Sin movimientos</h3>
                            <p className="text-neutral-400 text-sm px-8">No hay transacciones en este período.</p>
                            {!showAllDates && (
                                <button onClick={() => setShowAllDates(true)} className="mt-4 px-6 py-2.5 bg-neutral-900 text-white rounded-xl text-sm font-bold">
                                    Ver Todo
                                </button>
                            )}
                        </div>
                    ) : (
                        Object.entries(groupedTransactions).sort((a, b) => b[0].localeCompare(a[0])).map(([date, txs]) => (
                            <div key={date}>
                                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3 ml-1">
                                    {isSameDay(parseISO(date), new Date()) ? 'Hoy' : format(parseISO(date), 'd MMMM', { locale: es })}
                                </h4>
                                <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden divide-y divide-neutral-100">
                                    {txs.map(t => {
                                        const categoryName = t.categories?.name || t.category || 'General';
                                        const hasDescription = t.description && t.description !== categoryName;
                                        const icon = t.categories?.icon;

                                        return (
                                            <div key={t.id} className="px-4 py-4 flex items-center gap-4 hover:bg-neutral-50 transition-colors group">
                                                <div
                                                    className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm text-2xl"
                                                    style={{ backgroundColor: t.categories?.color ? `${t.categories.color}20` : '#f5f5f5' }}
                                                >
                                                    {icon || (t.type === 'expense' ? <ArrowDownRight className="w-5 h-5 text-rose-500" /> : <ArrowUpRight className="w-5 h-5 text-emerald-500" />)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <p className="font-bold text-neutral-900 truncate pr-2 text-base">{categoryName}</p>
                                                        <p className={`font-bold whitespace-nowrap text-lg ${t.type === 'income' ? 'text-emerald-600' : 'text-neutral-900'}`}>
                                                            {t.type === 'income' ? '+' : '-'}{new Intl.NumberFormat('es-ES').format(t.amount)}€
                                                        </p>
                                                    </div>
                                                    {hasDescription && <p className="text-sm text-neutral-500 truncate">{t.description}</p>}
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setEditingTransaction(t)}
                                                        className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteTransaction(t)}
                                                        disabled={deletingId === t.id}
                                                        className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors"
                                                    >
                                                        {deletingId === t.id ? (
                                                            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <Trash2 className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
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
                    accounts={[{ id: account.id, name: account.name }]}
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
