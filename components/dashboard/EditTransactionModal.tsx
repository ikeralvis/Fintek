'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, ChevronDown, ChevronUp, Landmark } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { NumericInput } from '@/components/ui/numeric-input';
import { CategoryPicker } from '@/components/ui/category-picker';
import { useDashboard } from '@/lib/DashboardContext';
import { matchCategoryFromText } from '@/lib/transactionSuggestions';
import { getFrequentCategoryIds } from '@/lib/frequentCategories';
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
    banks?: {
        name: string;
        color: string;
        logo_url?: string;
    };
    current_balance: number;
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
};

type Props = {
    transaction: Transaction;
    categories: Category[];
    accounts: Account[];
    onClose: () => void;
    onSaved: () => void;
};

export default function EditTransactionModal({ transaction, categories, accounts, onClose, onSaved }: Props) {
    const router = useRouter();
    const supabase = createClient();
    const { transactions } = useDashboard();
    const [loading, setLoading] = useState(false);

    const [amount, setAmount] = useState(transaction.amount.toString());
    const [description, setDescription] = useState(transaction.description || '');
    const [type, setType] = useState<'expense' | 'income'>(transaction.type as 'expense' | 'income');
    const [accountId, setAccountId] = useState(transaction.account_id);
    const [categoryId, setCategoryId] = useState(transaction.category_id || '');
    const [date, setDate] = useState(transaction.transaction_date.split('T')[0]);

    const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
    const [isAccountsExpanded, setIsAccountsExpanded] = useState(false);
    // Igual que en Nueva Transacción: recuerda si la categoría actual la puso la
    // auto-categorización, para no pisar una elección manual mientras se sigue escribiendo.
    const autoCategoryIdRef = useRef<string | null>(null);

    const selectedCategory = categories.find(c => c.id === categoryId);
    const frequentCategoryIds = useMemo(
        () => getFrequentCategoryIds(transactions, type, 5),
        [transactions, type]
    );
    const selectedAccount = accounts.find(a => a.id === accountId);

    const handleDescriptionChange = (value: string) => {
        setDescription(value);
        if (!categoryId || categoryId === autoCategoryIdRef.current) {
            const match = matchCategoryFromText(value, categories);
            if (match && match.id !== categoryId) {
                setCategoryId(match.id);
                autoCategoryIdRef.current = match.id;
            }
        }
    };

    const handleSelectCategory = (id: string) => {
        setCategoryId(id);
        autoCategoryIdRef.current = null;
        setIsCategoriesExpanded(false);
    };

    // Agrupar cuentas por banco
    const groupedAccounts = accounts.reduce((acc: any, account) => {
        const bankName = account.banks?.name || 'Otros';
        if (!acc[bankName]) acc[bankName] = [];
        acc[bankName].push(account);
        return acc;
    }, {});

    const parsedAmount = Number.parseFloat(amount) || 0;
    const canSubmit = parsedAmount > 0 && !!accountId && !!categoryId;

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setLoading(true);

        // Si se deja el título vacío, el nombre de la categoría elegida hace de título por defecto.
        const finalDescription = description.trim() || selectedCategory?.name || '';

        try {
            const newAmount = Number.parseFloat(amount);

            // Update transaction (el trigger de la BD actualiza automáticamente los saldos)
            const { error } = await supabase
                .from('transactions')
                .update({
                    amount: newAmount,
                    description: finalDescription,
                    type,
                    category_id: categoryId,
                    account_id: accountId,
                    transaction_date: date
                })
                .eq('id', transaction.id);

            if (error) throw error;

            onSaved();
            router.refresh();
        } catch (error) {
            console.error(error);
            alert('Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="w-full sm:max-w-md p-0 gap-0">
                <DialogHeader className="px-5 py-4 border-b border-border">
                    <DialogTitle>Editar Transacción</DialogTitle>
                </DialogHeader>

                <div className="p-5 space-y-4">
                    {/* Type Toggle */}
                    <Tabs value={type} onValueChange={(v) => setType(v as 'expense' | 'income')}>
                        <TabsList className="w-full">
                            <TabsTrigger value="expense" className="flex-1 data-[state=active]:text-accent-600 dark:data-[state=active]:text-accent-400">Gasto</TabsTrigger>
                            <TabsTrigger value="income" className="flex-1 data-[state=active]:text-secondary-600 dark:data-[state=active]:text-secondary-400">Ingreso</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Amount */}
                    <div className="py-2 text-center">
                        <NumericInput
                            value={amount}
                            onValueChange={setAmount}
                            placeholder="0,00"
                            autoFocus
                            currencySymbol="€"
                            currencyClassName={cn(
                                'text-2xl font-semibold',
                                type === 'expense' ? 'text-accent-500/60 dark:text-accent-400/60' : 'text-secondary-500/60 dark:text-secondary-400/60'
                            )}
                            wrapperClassName="mx-auto w-full max-w-[220px] justify-center"
                            className={cn(
                                'h-auto w-full border-none bg-transparent p-0 pr-8 text-center text-5xl font-semibold shadow-none placeholder:text-muted-foreground/40 focus-visible:ring-0',
                                type === 'expense' ? 'text-accent-600 dark:text-accent-400' : 'text-secondary-600 dark:text-secondary-400'
                            )}
                        />
                    </div>

                    {/* Description & Date */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Descripción"
                            value={description}
                            onChange={(e) => handleDescriptionChange(e.target.value)}
                            className="flex-1 rounded-xl border border-border bg-muted/60 px-3 py-2.5 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground focus:bg-card focus:ring-2 focus:ring-ring"
                        />
                        <div className="relative">
                            <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-[130px] rounded-xl border border-border bg-muted/60 py-2.5 pl-8 pr-2 text-sm font-medium text-foreground outline-none"
                            />
                        </div>
                    </div>

                    {/* Account Selector */}
                    <div className="overflow-hidden rounded-xl border border-border bg-muted/60">
                        <button
                            onClick={() => setIsAccountsExpanded(!isAccountsExpanded)}
                            className="flex w-full items-center justify-between p-2.5"
                        >
                            <span className="text-xs font-semibold uppercase text-muted-foreground">Cuenta</span>
                            <div className="flex items-center gap-2">
                                {selectedAccount && (
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-lg text-[8px] font-bold text-white"
                                            style={{ backgroundColor: selectedAccount.banks?.logo_url ? 'transparent' : (selectedAccount.banks?.color || 'var(--primary)') }}
                                        >
                                            {selectedAccount.banks?.logo_url ? (
                                                <img src={selectedAccount.banks.logo_url} alt="" className="h-full w-full object-contain" />
                                            ) : (
                                                selectedAccount.banks?.name?.substring(0, 2).toUpperCase() || <Landmark className="h-3 w-3" />
                                            )}
                                        </div>
                                        <span className="text-sm font-semibold text-foreground">{selectedAccount.name}</span>
                                    </div>
                                )}
                                {isAccountsExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                            </div>
                        </button>
                        {isAccountsExpanded && (
                            <div className="max-h-48 space-y-2 overflow-y-auto border-t border-border p-2">
                                {Object.entries(groupedAccounts).map(([bankName, bankAccounts]: [string, any]) => (
                                    <div key={bankName}>
                                        <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{bankName}</div>
                                        <div className="space-y-1">
                                            {bankAccounts.map((acc: Account) => (
                                                <button
                                                    key={acc.id}
                                                    onClick={() => { setAccountId(acc.id); setIsAccountsExpanded(false); }}
                                                    className={cn(
                                                        'flex w-full items-center gap-3 rounded-xl p-2.5 transition-all',
                                                        accountId === acc.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                                                    )}
                                                >
                                                    <div
                                                        className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg text-[10px] font-bold text-white"
                                                        style={{ backgroundColor: acc.banks?.logo_url ? 'transparent' : (acc.banks?.color || 'var(--primary)') }}
                                                    >
                                                        {acc.banks?.logo_url ? (
                                                            <img src={acc.banks.logo_url} alt="" className="h-full w-full object-contain" />
                                                        ) : (
                                                            acc.banks?.name?.substring(0, 2).toUpperCase() || <Landmark className="h-3 w-3" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1 text-left">
                                                        <p className={cn('truncate text-sm font-semibold', accountId === acc.id ? 'text-primary-foreground' : 'text-foreground')}>{acc.name}</p>
                                                        <p className={cn('text-xs tabular-nums', accountId === acc.id ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                                                            {formatCurrency(acc.current_balance)}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Category Selector */}
                    <div className="overflow-hidden rounded-xl border border-border bg-muted/60">
                        <button
                            onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
                            className="flex w-full items-center justify-between p-2.5"
                        >
                            <span className="text-xs font-semibold uppercase text-muted-foreground">Categoría</span>
                            <div className="flex items-center gap-2">
                                {selectedCategory && (
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="flex h-8 w-8 items-center justify-center rounded-xl"
                                            style={{ backgroundColor: selectedCategory.color ? `${selectedCategory.color}20` : 'var(--muted)' }}
                                        >
                                            <CategoryIcon
                                                name={selectedCategory.icon}
                                                className="h-4 w-4"
                                                style={{ color: selectedCategory.color || 'var(--muted-foreground)' }}
                                            />
                                        </div>
                                        <span className="text-sm font-semibold text-foreground">{selectedCategory.name}</span>
                                    </div>
                                )}
                                {isCategoriesExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                            </div>
                        </button>
                        {isCategoriesExpanded && (
                            <div className="max-h-72 overflow-y-auto border-t border-border p-3">
                                <CategoryPicker
                                    categories={categories}
                                    selectedId={categoryId}
                                    onSelect={handleSelectCategory}
                                    frequentIds={frequentCategoryIds}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="border-t border-border px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:justify-stretch sm:pb-4">
                    <Button variant="outline" onClick={onClose} className="flex-1">
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !canSubmit}
                        className={cn(
                            'flex-1 disabled:opacity-100',
                            !canSubmit || loading
                                ? 'bg-muted text-muted-foreground hover:bg-muted'
                                : type === 'income'
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-600/90'
                                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                        )}
                    >
                        {loading ? 'Guardando...' : 'Guardar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
