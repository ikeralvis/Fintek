'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronLeft, ChevronRight, X, Database, CalendarRange } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, isSameDay, isSameMonth, startOfMonth, endOfMonth, eachDayOfInterval, subMonths, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import EditTransactionModal from './EditTransactionModal';
import EditTransferModal from './EditTransferModal';
import ImportTransactionsModal from './ImportTransactionsModal';
import SwipeActionRow from './SwipeActionRow';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { SelectSheet, type SelectSheetOption } from '@/components/ui/select-sheet';
import { deleteTransfer } from '@/lib/actions/transfers';
import { cn, formatCurrency } from '@/lib/utils';

type Category = {
    id: string;
    name: string;
    icon?: string;
    color?: string;
};

type Account = {
    id: string;
    name: string;
    current_balance: number;
    banks?: {
        name: string;
        color: string;
        logo_url?: string;
    };
};

type Transaction = {
    id: string;
    amount: number;
    type: 'income' | 'expense' | 'transfer';
    description?: string;
    transaction_date: string;
    category_id?: string;
    account_id: string;
    related_account_id?: string | null;
    categories?: Category | null;
    category?: string;
    accounts?: { id?: string; name: string };
};

type Props = {
    initialTransactions: Transaction[];
    accounts: Account[];
    categories: Category[];
};

type ViewMode = 'month' | 'all';
type TypeFilter = 'all' | 'income' | 'expense';

const TYPE_SEGMENTS: { value: TypeFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'expense', label: 'Gastos' },
    { value: 'income', label: 'Ingresos' },
];

const MONTH_HISTORY = 24;

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Categoría · Concepto" — combina categoría y título en una sola línea legible. */
function categoryAndTitle(categoryName: string, description?: string) {
    const title = description?.trim();
    return title && title.toLowerCase() !== categoryName.toLowerCase()
        ? `${categoryName} · ${title}`
        : categoryName;
}

export default function TransactionsView({ initialTransactions, accounts, categories }: Props) {
    const router = useRouter();
    const supabase = createClient();
    const [transactions, setTransactions] = useState(initialTransactions);
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isPeriodSheetOpen, setIsPeriodSheetOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const periodOptions: SelectSheetOption[] = useMemo(() => {
        const months: SelectSheetOption[] = Array.from({ length: MONTH_HISTORY }, (_, i) => {
            const d = subMonths(new Date(), i);
            return {
                value: format(d, 'yyyy-MM'),
                label: capitalize(format(d, 'MMMM yyyy', { locale: es })),
            };
        });
        return [
            { value: 'all', label: 'Todo el histórico', description: 'Ver todas las transacciones', icon: <CalendarRange className="h-4 w-4" /> },
            ...months,
        ];
    }, []);

    const periodValue = viewMode === 'all' ? 'all' : format(currentDate, 'yyyy-MM');

    const handlePeriodSelect = (value: string) => {
        if (value === 'all') {
            setViewMode('all');
            return;
        }
        const [year, month] = value.split('-').map(Number);
        setCurrentDate(new Date(year, month - 1, 1));
        setViewMode('month');
    };

    const handleDeleteTransaction = async (tx: Transaction) => {
        if (!confirm('¿Eliminar esta transacción?')) return;

        setDeletingId(tx.id);
        try {
            if (tx.type === 'transfer') {
                const result = await deleteTransfer(tx.id);
                if (result.error) throw new Error(result.error);
            } else {
                // Eliminar transacción (el trigger de la BD actualiza automáticamente los saldos)
                const { error: delError } = await supabase.from('transactions').delete().eq('id', tx.id);
                if (delError) throw delError;
            }

            setTransactions(transactions.filter(t => t.id !== tx.id));
            toast.success('Transacción eliminada');
            router.refresh();
        } catch (err) {
            console.error('Error deleting transaction:', err);
            toast.error('Error al eliminar la transacción');
        } finally {
            setDeletingId(null);
        }
    };

    const handleEditSaved = async () => {
        setEditingTransaction(null);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('transactions')
                .select('*, categories(id, name, icon, color), accounts!account_id(id, name)')
                .eq('user_id', user.id)
                .order('transaction_date', { ascending: false });
            if (data) setTransactions(data as Transaction[]);
        }
        router.refresh();
    };

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const tDate = parseISO(t.transaction_date);
            if (viewMode === 'month' && !isSameMonth(tDate, currentDate)) return false;
            if (typeFilter !== 'all' && t.type !== typeFilter) return false;

            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const categoryName = t.categories?.name || t.category || '';
                return t.description?.toLowerCase().includes(q) || t.amount.toString().includes(q) || categoryName.toLowerCase().includes(q);
            }
            return true;
        });
    }, [transactions, viewMode, currentDate, typeFilter, searchQuery]);

    const { totalIncome, totalExpense } = useMemo(() => {
        let income = 0, expense = 0;
        filteredTransactions.forEach(t => {
            if (t.type === 'income') income += t.amount;
            else if (t.type === 'expense') expense += t.amount;
        });
        return { totalIncome: income, totalExpense: expense };
    }, [filteredTransactions]);

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
        <div className="min-h-screen bg-background pb-32 md:pb-8">
            {/* Header */}
            <div className="sticky top-0 z-30 glass-nav border-b px-5 py-4">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-xl font-bold text-foreground">Transacciones</h1>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="p-2 text-muted-foreground hover:bg-muted rounded-xl transition-colors"
                                title="Importar"
                            >
                                <Database className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setIsSearchOpen(!isSearchOpen)}
                                className={`p-2 rounded-xl transition-colors ${isSearchOpen ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                            >
                                {isSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Search bar (expandible) */}
                    <AnimatePresence initial={false}>
                        {isSearchOpen && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                className="overflow-hidden"
                            >
                                <div className="relative mb-4">
                                    <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Buscar transacciones..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-card border border-border rounded-xl pl-10 pr-10 py-3 outline-none text-sm font-medium text-foreground placeholder-muted-foreground focus:border-primary/40"
                                        autoFocus
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:bg-muted transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Selector temporal + segmented control de tipo */}
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 md:mx-0 md:px-0">
                        <div className="flex items-center gap-1 bg-card border border-border rounded-xl px-1 py-1 shrink-0">
                            {viewMode === 'month' && (
                                <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1.5 hover:bg-muted rounded-lg">
                                    <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                                </button>
                            )}
                            <button
                                onClick={() => setIsPeriodSheetOpen(true)}
                                className="px-2 text-sm font-semibold text-foreground min-w-[92px] text-center capitalize hover:text-primary transition-colors"
                            >
                                {viewMode === 'all' ? 'Todo el histórico' : format(currentDate, 'MMM yyyy', { locale: es })}
                            </button>
                            {viewMode === 'month' && (
                                <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1.5 hover:bg-muted rounded-lg">
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                </button>
                            )}
                        </div>

                        <div className="relative flex items-center bg-muted rounded-xl p-1 ml-auto shrink-0">
                            {TYPE_SEGMENTS.map((seg) => (
                                <button
                                    key={seg.value}
                                    onClick={() => setTypeFilter(seg.value)}
                                    className={cn(
                                        'relative min-w-[64px] rounded-lg py-1.5 text-xs font-semibold transition-colors',
                                        typeFilter === seg.value ? 'text-foreground' : 'text-muted-foreground'
                                    )}
                                >
                                    {typeFilter === seg.value && (
                                        <motion.span
                                            layoutId="txn-type-segment"
                                            className="absolute inset-0 rounded-lg bg-card shadow-sm"
                                            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                        />
                                    )}
                                    <span className="relative z-10">{seg.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-5 space-y-6 max-w-6xl mx-auto">
                {/* Summary Card */}
                <div className="bg-card rounded-2xl border border-border p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Balance del período</p>
                            <p className="text-3xl font-bold tabular-nums text-foreground">{formatCurrency(totalIncome - totalExpense)}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex-1 rounded-xl bg-secondary-500/10 px-3 py-2">
                            <p className="text-[10px] text-secondary-600 dark:text-secondary-400 font-semibold uppercase">Ingresos</p>
                            <p className="text-lg font-semibold tabular-nums text-secondary-700 dark:text-secondary-400">+{formatCurrency(totalIncome)}</p>
                        </div>
                        <div className="flex-1 rounded-xl bg-accent-500/10 px-3 py-2">
                            <p className="text-[10px] text-accent-600 dark:text-accent-400 font-semibold uppercase">Gastos</p>
                            <p className="text-lg font-semibold tabular-nums text-accent-700 dark:text-accent-400">{formatCurrency(totalExpense > 0 ? -totalExpense : 0)}</p>
                        </div>
                    </div>
                </div>

                {/* Transaction List */}
                <div className="space-y-5">
                    {Object.keys(groupedTransactions).length === 0 ? (
                        <div className="text-center py-16 bg-card rounded-xl border border-border">
                            <p className="text-muted-foreground text-sm">No hay transacciones</p>
                        </div>
                    ) : (
                        Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a)).map(date => (
                            <div key={date}>
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 ml-1">
                                    {isSameDay(parseISO(date), new Date()) ? 'Hoy' : format(parseISO(date), 'd MMMM yyyy', { locale: es })}
                                </h3>
                                <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
                                    {groupedTransactions[date].map(t => {
                                        const isTransfer = t.type === 'transfer';
                                        const categoryName = t.categories?.name || t.category || (isTransfer ? 'Transferencia' : 'General');
                                        const accountName = accounts.find(a => a.id === t.account_id)?.name || t.accounts?.name || 'Cuenta';
                                        const destinationName = t.related_account_id
                                            ? accounts.find(a => a.id === t.related_account_id)?.name || 'Cuenta destino'
                                            : null;

                                        return (
                                            <SwipeActionRow
                                                key={t.id}
                                                onEdit={() => setEditingTransaction(t)}
                                                onDelete={() => handleDeleteTransaction(t)}
                                                disabled={deletingId === t.id}
                                                className="bg-card px-4 py-3 flex items-center gap-3"
                                            >
                                                {/* Category Icon */}
                                                <div
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                                    style={{ backgroundColor: t.categories?.color ? `${t.categories.color}15` : (isTransfer ? '#eff6ff' : '#f5f5f5') }}
                                                >
                                                    <CategoryIcon
                                                        name={t.categories?.icon || (isTransfer ? 'down' : (t.type === 'income' ? 'up' : 'down'))}
                                                        className="w-5 h-5"
                                                        style={{ color: t.categories?.color || (isTransfer ? '#2563eb' : (t.type === 'income' ? '#10b981' : '#f43f5e')) }}
                                                    />
                                                </div>

                                                {/* Details */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-foreground text-sm truncate">
                                                        {isTransfer ? categoryName : categoryAndTitle(categoryName, t.description)}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {isTransfer && destinationName ? `${accountName} -> ${destinationName}` : accountName}
                                                    </p>
                                                </div>

                                                {/* Amount */}
                                                <p className={`font-semibold text-sm tabular-nums shrink-0 ${t.type === 'income' ? 'text-secondary-600 dark:text-secondary-400' : t.type === 'transfer' ? 'text-primary' : 'text-accent-600 dark:text-accent-400'}`}>
                                                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                                </p>
                                            </SwipeActionRow>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Period SelectSheet */}
            <SelectSheet
                options={periodOptions}
                value={periodValue}
                onValueChange={handlePeriodSelect}
                title="Selecciona un período"
                hideTrigger
                open={isPeriodSheetOpen}
                onOpenChange={setIsPeriodSheetOpen}
            />

            {/* Edit Modal */}
            {editingTransaction && editingTransaction.type === 'transfer' ? (
                <EditTransferModal
                    transaction={editingTransaction}
                    categories={categories}
                    accounts={accounts}
                    onClose={() => setEditingTransaction(null)}
                    onSaved={handleEditSaved}
                />
            ) : editingTransaction && (
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
                    }}
                />
            )}
        </div>
    );
}
