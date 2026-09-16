'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, ChevronDown, ChevronUp, Check, X, Landmark } from 'lucide-react';
import { toast } from 'sonner';
import { updateTransfer } from '@/lib/actions/transfers';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { NumericInput } from '@/components/ui/numeric-input';
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
    } | null;
    current_balance: number;
};

type Transaction = {
    id: string;
    amount: number;
    description?: string;
    transaction_date: string;
    category_id?: string;
    account_id: string;
    related_account_id?: string | null;
};

type Props = {
    transaction: Transaction;
    categories: Category[];
    accounts: Account[];
    onClose: () => void;
    onSaved: () => void;
};

export default function EditTransferModal({ transaction, categories, accounts, onClose, onSaved }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [amount, setAmount] = useState(transaction.amount.toString());
    const [description, setDescription] = useState(transaction.description || '');
    const [fromAccountId, setFromAccountId] = useState(transaction.account_id);
    const [toAccountId, setToAccountId] = useState(transaction.related_account_id || '');
    const [categoryId, setCategoryId] = useState(transaction.category_id || '');
    const [date, setDate] = useState(transaction.transaction_date.split('T')[0]);

    const [isFromExpanded, setIsFromExpanded] = useState(false);
    const [isToExpanded, setIsToExpanded] = useState(false);
    const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);

    const selectedFrom = accounts.find(a => a.id === fromAccountId);
    const selectedTo = accounts.find(a => a.id === toAccountId);
    const selectedCategory = categories.find(c => c.id === categoryId);

    const groupedAccounts = accounts.reduce((acc: Record<string, Account[]>, account) => {
        const bankName = account.banks?.name || 'Otros';
        if (!acc[bankName]) acc[bankName] = [];
        acc[bankName].push(account);
        return acc;
    }, {});

    const canSubmit = !!amount && !!fromAccountId && !!toAccountId && fromAccountId !== toAccountId;

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setLoading(true);
        setError(null);

        try {
            const result = await updateTransfer(transaction.id, {
                fromAccountId,
                toAccountId,
                categoryId: categoryId || null,
                amount: Number.parseFloat(amount),
                description: description || 'Transferencia',
                transactionDate: date,
            });

            if (result.error) throw new Error(result.error);

            toast.success('Transferencia actualizada');
            onSaved();
            router.refresh();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    const AccountPicker = ({
        label, expanded, setExpanded, selected, setSelected, excludeId,
    }: {
        label: string;
        expanded: boolean;
        setExpanded: (v: boolean) => void;
        selected: Account | undefined;
        setSelected: (id: string) => void;
        excludeId?: string;
    }) => (
        <div className="overflow-hidden rounded-xl border border-border bg-muted/60">
            <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between p-2.5">
                <span className="text-xs font-semibold uppercase text-muted-foreground">{label}</span>
                <div className="flex items-center gap-2">
                    {selected && (
                        <div className="flex items-center gap-2">
                            <div
                                className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-lg text-[8px] font-bold text-white"
                                style={{ backgroundColor: selected.banks?.logo_url ? 'transparent' : (selected.banks?.color || 'var(--primary)') }}
                            >
                                {selected.banks?.logo_url ? (
                                    <img src={selected.banks.logo_url} alt="" className="h-full w-full object-contain" />
                                ) : (
                                    selected.banks?.name?.substring(0, 2).toUpperCase() || <Landmark className="h-3 w-3" />
                                )}
                            </div>
                            <span className="text-sm font-semibold text-foreground">{selected.name}</span>
                        </div>
                    )}
                    {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
            </button>
            {expanded && (
                <div className="max-h-48 space-y-2 overflow-y-auto border-t border-border p-2">
                    {Object.entries(groupedAccounts).map(([bankName, bankAccounts]) => (
                        <div key={bankName}>
                            <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{bankName}</div>
                            <div className="space-y-1">
                                {bankAccounts.filter(acc => acc.id !== excludeId).map((acc) => {
                                    const isSelected = selected?.id === acc.id;
                                    return (
                                        <button
                                            key={acc.id}
                                            onClick={() => { setSelected(acc.id); setExpanded(false); }}
                                            className={cn(
                                                'flex w-full items-center gap-3 rounded-xl p-2.5 transition-all',
                                                isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
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
                                                <p className={cn('truncate text-sm font-semibold', isSelected ? 'text-primary-foreground' : 'text-foreground')}>{acc.name}</p>
                                                <p className={cn('text-xs tabular-nums', isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                                                    {formatCurrency(acc.current_balance)}
                                                </p>
                                            </div>
                                            {isSelected && <Check className="h-4 w-4 shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="w-full sm:max-w-md p-0 gap-0">
                <DialogHeader className="px-5 py-4 border-b border-border">
                    <DialogTitle>Editar Transferencia</DialogTitle>
                </DialogHeader>

                <div className="p-5 space-y-4">
                    {error && (
                        <div className="rounded-xl border border-accent-500/20 bg-accent-500/10 px-3 py-2 text-xs font-medium text-accent-600 dark:text-accent-400">{error}</div>
                    )}

                    {/* Amount */}
                    <div className="py-2 text-center">
                        <NumericInput
                            value={amount}
                            onValueChange={setAmount}
                            placeholder="0,00"
                            autoFocus
                            currencySymbol="€"
                            currencyClassName="text-2xl font-semibold text-primary/50"
                            wrapperClassName="mx-auto w-full max-w-[220px] justify-center"
                            className="h-auto w-full border-none bg-transparent p-0 pr-8 text-center text-5xl font-semibold text-primary shadow-none placeholder:text-muted-foreground/40 focus-visible:ring-0"
                        />
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

                    <AccountPicker label="Desde" expanded={isFromExpanded} setExpanded={setIsFromExpanded} selected={selectedFrom} setSelected={setFromAccountId} />
                    <AccountPicker label="Para" expanded={isToExpanded} setExpanded={setIsToExpanded} selected={selectedTo} setSelected={setToAccountId} excludeId={fromAccountId} />

                    {/* Category Selector */}
                    <div className="overflow-hidden rounded-xl border border-border bg-muted/60">
                        <button
                            onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
                            className="flex w-full items-center justify-between p-2.5"
                        >
                            <span className="text-xs font-semibold uppercase text-muted-foreground">Categoría (opcional)</span>
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
                                    <button
                                        onClick={() => { setCategoryId(''); setIsCategoriesExpanded(false); }}
                                        className={cn(
                                            'flex flex-col items-center gap-1.5 rounded-xl p-3 transition-all',
                                            categoryId === '' ? 'bg-primary' : 'bg-card/50 hover:bg-card'
                                        )}
                                    >
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                                            <X className={cn('h-5 w-5', categoryId === '' ? 'text-primary-foreground' : 'text-muted-foreground')} />
                                        </div>
                                        <span className={cn('w-full truncate text-center text-[10px] font-semibold leading-tight', categoryId === '' ? 'text-primary-foreground' : 'text-foreground')}>Ninguna</span>
                                    </button>
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

                <DialogFooter className="border-t border-border px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:justify-stretch sm:pb-4">
                    <Button variant="outline" onClick={onClose} className="flex-1">
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading || !canSubmit} className="flex-1">
                        {loading ? 'Guardando...' : 'Guardar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
