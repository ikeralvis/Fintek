'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronDown, ChevronLeft, ChevronRight, Trash2, Pencil, X, Database } from 'lucide-react';
import { format, parseISO, isSameDay, isSameMonth, isSameWeek, isSameYear, startOfMonth, endOfMonth, eachDayOfInterval, subMonths, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/client';
import EditTransactionModal from './EditTransactionModal';
import ImportTransactionsModal from './ImportTransactionsModal';
import CategoryIcon from '@/components/ui/CategoryIcon';

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
    accounts?: { id?: string; name: string };
};

type Props = {
    initialTransactions: Transaction[];
    accounts: { id: string; name: string }[];
    categories: Category[];
};

export default function TransactionsView({ initialTransactions, accounts, categories }: Props) {
    const router = useRouter();
    const supabase = createClient();
    // Filter out transfers by default - they don't count as income/expense
    const [transactions, setTransactions] = useState(initialTransactions.filter(t => t.type !== 'transfer'));
    const [period, setPeriod] = useState<'month' | 'week' | 'year'>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const handleDeleteTransaction = async (tx: Transaction) => {
        if (!confirm('¿Eliminar esta transacción?')) return;

        setDeletingId(tx.id);
        try {
            // Eliminar transacción (el trigger de la BD actualiza automáticamente los saldos)
            const { error: delError } = await supabase.from('transactions').delete().eq('id', tx.id);
            if (delError) throw delError;

            setTransactions(transactions.filter(t => t.id !== tx.id));
            router.refresh();
        } catch (err) {
            console.error('Error deleting transaction:', err);
            alert('Error al eliminar la transacción');
        } finally {
            setDeletingId(null);
        }
    };

    const handleEditSaved = () => {
        setEditingTransaction(null);
        router.refresh();
        window.location.reload();
    };

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const tDate = parseISO(t.transaction_date);
            if (period === 'month' && !isSameMonth(tDate, currentDate)) return false;
            if (period === 'year' && !isSameYear(tDate, currentDate)) return false;
            if (period === 'week' && !isSameWeek(tDate, currentDate, { locale: es })) return false;
            if (typeFilter !== 'all' && t.type !== typeFilter) return false;

            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const categoryName = t.categories?.name || t.category || '';
                return t.description?.toLowerCase().includes(q) || t.amount.toString().includes(q) || categoryName.toLowerCase().includes(q);
            }
            return true;
        });
    }, [transactions, period, currentDate, typeFilter, searchQuery]);

    const { totalIncome, totalExpense, chartData } = useMemo(() => {
        let income = 0, expense = 0;
        const dailyStats: Record<string, number> = {};

        filteredTransactions.forEach(t => {
            if (t.type === 'income') income += t.amount;
            else expense += t.amount;
            const day = t.transaction_date.substring(0, 10);
            dailyStats[day] = (dailyStats[day] || 0) + (t.type === 'income' ? t.amount : -t.amount);
        });

        let data = [];
        if (period === 'month') {
            const days = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
            data = days.map(d => ({ date: format(d, 'yyyy-MM-dd'), value: dailyStats[format(d, 'yyyy-MM-dd')] || 0 }));
        } else {
            data = Object.entries(dailyStats).sort((a, b) => a[0].localeCompare(b[0])).map(([date, value]) => ({ date, value }));
        }

        return { totalIncome: income, totalExpense: expense, chartData: data };
    }, [filteredTransactions, period, currentDate]);

    const groupedTransactions = useMemo(() => {
        const grouped: Record<string, Transaction[]> = {};
        filteredTransactions.forEach(t => {
            const dateKey = t.transaction_date.substring(0, 10);
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(t);
        });
        return grouped;
    }, [filteredTransactions]);

    return (
        <div className="min-h-screen bg-neutral-50 pb-32">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-neutral-50/80 backdrop-blur-xl px-5 py-4">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-xl font-bold text-neutral-900">Transacciones</h1>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-xl transition-colors"
                            title="Importar"
                        >
                            <Database className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={() => setIsSearchOpen(!isSearchOpen)} 
                            className={`p-2 rounded-xl transition-colors ${isSearchOpen ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-100'}`}
                        >
                            {isSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Search bar */}
                {isSearchOpen && (
                    <input
                        type="text"
                        placeholder="Buscar transacciones..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 outline-none text-sm font-medium text-neutral-900 placeholder-neutral-400 mb-4 focus:border-neutral-300"
                        autoFocus
                    />
                )}

                {/* Period selector and filters */}
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                    <div className="relative shrink-0">
                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value as 'month' | 'week' | 'year')}
                            className="appearance-none bg-neutral-900 text-white rounded-xl pl-3 pr-8 py-2 text-sm font-medium focus:outline-none"
                        >
                            <option value="month">Mes</option>
                            <option value="week">Semana</option>
                            <option value="year">Año</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" />
                    </div>

                    {period === 'month' && (
                        <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-xl px-1 py-1">
                            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1.5 hover:bg-neutral-100 rounded-lg">
                                <ChevronLeft className="w-4 h-4 text-neutral-600" />
                            </button>
                            <span className="text-sm font-medium text-neutral-700 min-w-[80px] text-center capitalize">
                                {format(currentDate, 'MMM yyyy', { locale: es })}
                            </span>
                            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1.5 hover:bg-neutral-100 rounded-lg">
                                <ChevronRight className="w-4 h-4 text-neutral-600" />
                            </button>
                        </div>
                    )}

                    <div className="flex gap-1 ml-auto shrink-0">
                        {(['all', 'income', 'expense'] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => setTypeFilter(t)}
                                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                                    typeFilter === t 
                                        ? 'bg-neutral-900 text-white' 
                                        : 'bg-white border border-neutral-200 text-neutral-500 hover:border-neutral-300'
                                }`}
                            >
                                {t === 'all' ? 'Todo' : t === 'income' ? 'Ingreso' : 'Gasto'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="px-5 space-y-6">
                {/* Summary Card */}
                <div className="bg-neutral-900 rounded-2xl p-5 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-xs text-neutral-400 uppercase tracking-wide font-medium">Balance del período</p>
                            <p className="text-3xl font-bold">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalIncome - totalExpense)}</p>
                        </div>
                    </div>
                    <div className="flex gap-6">
                        <div>
                            <p className="text-[10px] text-neutral-500 uppercase">Ingresos</p>
                            <p className="text-lg font-semibold text-emerald-400">+{new Intl.NumberFormat('es-ES').format(totalIncome)}€</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-neutral-500 uppercase">Gastos</p>
                            <p className="text-lg font-semibold text-rose-400">-{new Intl.NumberFormat('es-ES').format(totalExpense)}€</p>
                        </div>
                    </div>
                </div>

                {/* Transaction List */}
                <div className="space-y-5">
                    {Object.keys(groupedTransactions).length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-xl border border-neutral-100">
                            <p className="text-neutral-400 text-sm">No hay transacciones</p>
                        </div>
                    ) : (
                        Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a)).map(date => (
                            <div key={date}>
                                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2 ml-1">
                                    {isSameDay(parseISO(date), new Date()) ? 'Hoy' : format(parseISO(date), 'd MMMM yyyy', { locale: es })}
                                </h3>
                                <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden divide-y divide-neutral-50">
                                    {groupedTransactions[date].map(t => {
                                        const categoryName = t.categories?.name || t.category || 'General';

                                        return (
                                            <div key={t.id} className="px-4 py-3 flex items-center gap-3 group">
                                                {/* Category Icon */}
                                                <div
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                                    style={{ backgroundColor: t.categories?.color ? `${t.categories.color}15` : '#f5f5f5' }}
                                                >
                                                    <CategoryIcon 
                                                        name={t.categories?.icon || (t.type === 'income' ? 'up' : 'down')} 
                                                        className="w-5 h-5" 
                                                        style={{ color: t.categories?.color || (t.type === 'income' ? '#10b981' : '#f43f5e') }} 
                                                    />
                                                </div>

                                                {/* Details */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-neutral-900 text-sm truncate">{categoryName}</p>
                                                    <p className="text-xs text-neutral-400 truncate">{t.accounts?.name}</p>
                                                </div>

                                                {/* Amount */}
                                                <p className={`font-semibold text-sm ${t.type === 'income' ? 'text-emerald-600' : 'text-neutral-900'}`}>
                                                    {t.type === 'income' ? '+' : '-'}{new Intl.NumberFormat('es-ES').format(t.amount)}€
                                                </p>

                                                {/* Actions - Siempre visibles */}
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => setEditingTransaction(t)}
                                                        className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteTransaction(t)}
                                                        disabled={deletingId === t.id}
                                                        className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                                                    >
                                                        {deletingId === t.id ? (
                                                            <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
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
                    accounts={accounts}
                    onClose={() => setEditingTransaction(null)}
                    onSaved={handleEditSaved}
                />
            )}

            {/* Import Modal */}
            {isImportModalOpen && (
                <ImportTransactionsModal
                    accounts={accounts}
                    categories={categories}
                    onClose={() => setIsImportModalOpen(false)}
                    onImportSuccess={() => {
                        setIsImportModalOpen(false);
                        router.refresh();
                        window.location.reload();
                    }}
                />
            )}
        </div>
    );
}
