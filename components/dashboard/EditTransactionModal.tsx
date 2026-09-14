'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
    const [loading, setLoading] = useState(false);

    const [amount, setAmount] = useState(transaction.amount.toString());
    const [description, setDescription] = useState(transaction.description || '');
    const [type, setType] = useState<'expense' | 'income'>(transaction.type as 'expense' | 'income');
    const [accountId, setAccountId] = useState(transaction.account_id);
    const [categoryId, setCategoryId] = useState(transaction.category_id || '');
    const [date, setDate] = useState(transaction.transaction_date.split('T')[0]);

    const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
    const [isAccountsExpanded, setIsAccountsExpanded] = useState(false);

    const selectedCategory = categories.find(c => c.id === categoryId);
    const selectedAccount = accounts.find(a => a.id === accountId);

    // Agrupar cuentas por banco
    const groupedAccounts = accounts.reduce((acc: any, account) => {
        const bankName = account.banks?.name || 'Otros';
        if (!acc[bankName]) acc[bankName] = [];
        acc[bankName].push(account);
        return acc;
    }, {});

    const handleSubmit = async () => {
        if (!amount || !accountId || !categoryId) return;
        setLoading(true);

        try {
            const newAmount = Number.parseFloat(amount);

            // Update transaction (el trigger de la BD actualiza automáticamente los saldos)
            const { error } = await supabase
                .from('transactions')
                .update({
                    amount: newAmount,
                    description,
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
            <DialogContent className="max-w-md p-0 gap-0">
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
                        <div className="relative inline-flex items-center justify-center">
                            <span className={cn(
                                'mr-1 text-2xl font-semibold',
                                type === 'expense' ? 'text-accent-500/60 dark:text-accent-400/60' : 'text-secondary-500/60 dark:text-secondary-400/60'
                            )}>€</span>
                            <input
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className={cn(
                                    'w-full max-w-[220px] bg-transparent text-center text-5xl font-semibold tabular-nums outline-none placeholder:text-muted-foreground/40',
                                    type === 'expense' ? 'text-accent-600 dark:text-accent-400' : 'text-secondary-600 dark:text-secondary-400'
                                )}
                            />
                        </div>
                    </div>

                    {/* Description & Date */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Descripción"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
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
                                                selectedAccount.banks?.name?.substring(0, 2).toUpperCase() || '💰'
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
                                                            acc.banks?.name?.substring(0, 2).toUpperCase() || '💰'
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1 text-left">
                                                        <p className={cn('truncate text-sm font-semibold', accountId === acc.id ? 'text-primary-foreground' : 'text-foreground')}>{acc.name}</p>
                                                        <p className={cn('text-xs tabular-nums', accountId === acc.id ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                                                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(acc.current_balance)}
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
                                <div className="grid grid-cols-4 gap-2">
                                    {categories.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => { setCategoryId(cat.id); setIsCategoriesExpanded(false); }}
                                            className={cn(
                                                'flex flex-col items-center gap-1.5 rounded-xl p-3 transition-all',
                                                categoryId === cat.id ? 'bg-primary' : 'bg-card/50 hover:bg-card'
                                            )}
                                        >
                                            <div
                                                className={cn('flex h-12 w-12 items-center justify-center rounded-xl', categoryId === cat.id && 'scale-105')}
                                                style={{ backgroundColor: cat.color ? `${cat.color}25` : 'var(--muted)' }}
                                            >
                                                <CategoryIcon
                                                    name={cat.icon}
                                                    className="h-6 w-6"
                                                    style={{ color: cat.color || 'var(--muted-foreground)' }}
                                                />
                                            </div>
                                            <span className={cn('w-full truncate text-center text-[10px] font-semibold leading-tight', categoryId === cat.id ? 'text-primary-foreground' : 'text-foreground')}>
                                                {cat.name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="border-t border-border px-5 py-4 sm:justify-stretch">
                    <Button variant="outline" onClick={onClose} className="flex-1">
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading || !amount || !accountId || !categoryId} className="flex-1">
                        {loading ? 'Guardando...' : 'Guardar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
