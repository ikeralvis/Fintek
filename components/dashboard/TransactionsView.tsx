'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronDown, ChevronLeft, ChevronRight, Trash2, Pencil } from 'lucide-react';
import { format, parseISO, isSameDay, isSameMonth, isSameWeek, isSameYear, startOfMonth, endOfMonth, eachDayOfInterval, subMonths, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { createClient } from '@/lib/supabase/client';
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
            const { error: delError } = await supabase.from('transactions').delete().eq('id', tx.id);
            if (delError) throw delError;

            // For transfers, update both accounts
            if (tx.type === 'transfer') {
                // For transfers, we need to get the related account and revert both
                const { data: txData } = await supabase
                    .from('transactions')
                    .select('related_account_id')
                    .eq('id', tx.id)
                    .single();

                // Since we already deleted it, we just need to revert the balances
                // This is handled in the server transfer action
            } else {
                // For income/expense, revert single account
                const { data: account } = await supabase.from('accounts').select('current_balance').eq('id', tx.account_id).single();
                if (account) {
                    const balanceChange = tx.type === 'income' ? -tx.amount : tx.amount;
                    await supabase.from('accounts').update({ current_balance: account.current_balance + balanceChange }).eq('id', tx.account_id);
                }
            }

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
        <div className="min-h-screen bg-neutral-50 pb-40">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-neutral-100 px-4 h-14 flex items-center justify-between">
                <h1 className="text-lg font-bold text-neutral-900">Transacciones</h1>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-neutral-100 text-neutral-900 rounded-xl text-sm font-bold hover:bg-neutral-200 transition-colors"
                    >
                        <Database className="w-4 h-4" />
                        <span className="hidden sm:inline">Importar</span>
                    </button>
                    <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-xl">
                        <Search className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {isSearchOpen && (
                <div className="bg-white px-4 pb-4 pt-2 border-b border-neutral-100">
                    <input
                        type="text"
                        placeholder="Buscar transacciones..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-neutral-100 rounded-xl px-4 py-3 outline-none font-medium text-neutral-900 placeholder-neutral-400"
                        autoFocus
                    />
                </div>
            )}

            <div className="container mx-auto px-4 max-w-2xl pt-5 space-y-6">
                {/* Summary Card */}
                <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl" />

                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <select
                                    value={period}
                                    onChange={(e) => setPeriod(e.target.value as 'month' | 'week' | 'year')}
                                    className="appearance-none bg-white/10 border border-white/20 rounded-xl pl-4 pr-9 py-2 text-sm font-semibold text-white focus:outline-none"
                                >
                                    <option value="month" className="text-black">Mensual</option>
                                    <option value="week" className="text-black">Semana</option>
                                    <option value="year" className="text-black">Año</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
                            </div>
                            {period === 'month' && (
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1.5 rounded-lg hover:bg-white/10">
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="text-sm font-semibold text-white/80 min-w-[80px] text-center capitalize">
                                        {format(currentDate, 'MMM yyyy', { locale: es })}
                                    </span>
                                    <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1.5 rounded-lg hover:bg-white/10">
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="relative z-10">
                        <p className="text-xs text-white/50 uppercase tracking-widest font-bold mb-1">Balance Neto</p>
                        <p className="text-4xl font-black mb-4">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalIncome - totalExpense)}</p>

                        <div className="flex gap-6">
                            <div>
                                <p className="text-[10px] text-white/50 font-bold uppercase">Ingresos</p>
                                <p className="text-lg font-bold text-emerald-400">+{new Intl.NumberFormat('es-ES').format(totalIncome)}€</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-white/50 font-bold uppercase">Gastos</p>
                                <p className="text-lg font-bold text-rose-400">-{new Intl.NumberFormat('es-ES').format(totalExpense)}€</p>
                            </div>
                        </div>
                    </div>

                    <div className="w-32 h-20 opacity-20 absolute right-4 bottom-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <Area type="monotone" dataKey="value" stroke="#fff" fill="#fff" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {(['all', 'income', 'expense'] as const).map(t => (
                        <button key={t} onClick={() => setTypeFilter(t)} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${typeFilter === t ? 'bg-neutral-900 text-white shadow-lg' : 'bg-white border border-neutral-200 text-neutral-500'}`}>
                            {t === 'all' ? 'Todos' : t === 'income' ? 'Ingresos' : 'Gastos'}
                        </button>
                    ))}
                </div>

                {/* Transaction List */}
                <div className="space-y-6 pb-20">
                    {Object.keys(groupedTransactions).length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-neutral-200">
                            <p className="text-neutral-400 font-medium">No hay transacciones</p>
                        </div>
                    ) : (
                        Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a)).map(date => (
                            <div key={date}>
                                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3 ml-1">
                                    {isSameDay(parseISO(date), new Date()) ? 'Hoy' : format(parseISO(date), 'd MMMM yyyy', { locale: es })}
                                </h3>
                                <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden divide-y divide-neutral-100">
                                    {groupedTransactions[date].map(t => {
                                        const categoryName = t.categories?.name || t.category || 'General';
                                        const hasDescription = t.description && t.description !== categoryName;

                                        return (
                                            <div key={t.id} className="px-4 py-4 flex items-center gap-4 hover:bg-neutral-50 transition-colors group">
                                                {/* Category Icon */}
                                                <div
                                                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-sm"
                                                    style={{ backgroundColor: t.categories?.color ? `${t.categories.color}20` : '#f5f5f5' }}
                                                >
                                                    {t.categories?.icon || (t.type === 'income' ? '💰' : '💸')}
                                                </div>

                                                {/* Details & Info */}
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-neutral-900 truncate text-base leading-tight mb-1">{categoryName}</h4>
                                                    <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                                                        {hasDescription && <span className="truncate max-w-[100px] sm:max-w-[200px]">{t.description}</span>}
                                                        {hasDescription && <span className="text-neutral-300">·</span>}
                                                        <span className="text-neutral-400 truncate">{t.accounts?.name}</span>
                                                    </div>
                                                </div>

                                                {/* Amount */}
                                                <div className="text-right">
                                                    <span className={`font-bold whitespace-nowrap text-lg ${t.type === 'income' ? 'text-emerald-600' : 'text-neutral-900'}`}>
                                                        {t.type === 'income' ? '+' : '-'}{new Intl.NumberFormat('es-ES').format(t.amount)}€
                                                    </span>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-1.5 ml-2">
                                                    <button
                                                        onClick={() => setEditingTransaction(t)}
                                                        className="p-2 bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 rounded-xl transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteTransaction(t)}
                                                        disabled={deletingId === t.id}
                                                        className="p-2 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 rounded-xl transition-colors disabled:opacity-50"
                                                        title="Eliminar"
                                                    >
                                                        {deletingId === t.id ? (
                                                            <div className="w-3.5 h-3.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <Trash2 className="w-3.5 h-3.5" />
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
