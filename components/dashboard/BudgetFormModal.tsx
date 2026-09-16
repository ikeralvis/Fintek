'use client';

import { useState, useEffect } from 'react';
import { Trash2, Check, PiggyBank, Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { upsertBudget, deleteBudget } from '@/lib/actions/budgets';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { NumericInput } from '@/components/ui/numeric-input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency as fmt } from '@/lib/utils';

export default function BudgetFormModal({
    isOpen,
    onClose,
    categories,
    existingBudget,
    averageByCategory = {},
    existingCategoryIds = [],
}: {
    isOpen: boolean;
    onClose: () => void;
    categories: any[];
    existingBudget?: any; // If passed, we are editing
    averageByCategory?: Record<string, number>;
    /** Ids de categorías que ya tienen un presupuesto activo (se deshabilitan al crear uno nuevo). */
    existingCategoryIds?: string[];
}) {
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [isSavings, setIsSavings] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (existingBudget) {
                setAmount(existingBudget.amount.toString());
                setCategoryId(existingBudget.category_id);
                setIsSavings(!!existingBudget.is_savings);
                setIsCategoriesExpanded(false);
            } else {
                setAmount('');
                setCategoryId('');
                setIsSavings(false);
                setIsCategoriesExpanded(true);
            }
        }
    }, [isOpen, existingBudget]);

    const selectedCategory = categories.find((c) => c.id === categoryId);

    const suggestedAverage = categoryId ? averageByCategory[categoryId] : undefined;
    const showSuggestion = !isSavings && suggestedAverage && suggestedAverage > 0 &&
        Math.round(suggestedAverage) !== Math.round(parseFloat(amount) || 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!categoryId || !amount) return;

        setLoading(true);
        const res = await upsertBudget(categoryId, parseFloat(amount), isSavings);
        setLoading(false);

        if (res.success) {
            toast.success(existingBudget ? 'Presupuesto actualizado' : 'Presupuesto creado');
            onClose();
        } else {
            toast.error('Error al guardar: ' + res.error);
        }
    };

    const handleDelete = async () => {
        if (!existingBudget || !confirm('¿Eliminar este presupuesto?')) return;
        setLoading(true);
        await deleteBudget(existingBudget.id);
        setLoading(false);
        toast.success('Presupuesto eliminado');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="w-full sm:max-w-md p-0 gap-0">
                <DialogHeader className="px-5 py-4 border-b border-border">
                    <DialogTitle>{existingBudget ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Category Select: mismo patrón accesible (colapsable + grid vertical) que el modal de Nueva Transacción */}
                    <div className="bg-muted/40 border border-border rounded-2xl overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
                            className="w-full p-3 flex items-center justify-between hover:bg-muted/60 transition-colors"
                        >
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Categoría</span>
                            <div className="flex items-center gap-2 min-w-0">
                                {selectedCategory ? (
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div
                                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                            style={{ backgroundColor: selectedCategory.color ? `${selectedCategory.color}20` : 'var(--muted)' }}
                                        >
                                            <CategoryIcon name={selectedCategory.icon} className="w-3.5 h-3.5" style={{ color: selectedCategory.color || 'var(--muted-foreground)' }} />
                                        </div>
                                        <span className="text-sm font-bold text-foreground truncate">{selectedCategory.name}</span>
                                    </div>
                                ) : (
                                    <span className="text-xs text-muted-foreground">Elegir…</span>
                                )}
                                {isCategoriesExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                            </div>
                        </button>

                        {isCategoriesExpanded && (
                            <div className="border-t border-border p-3 max-h-64 overflow-y-auto">
                                <div className="grid grid-cols-4 gap-2">
                                    {categories.map((cat) => {
                                        const alreadyBudgeted = existingCategoryIds.includes(cat.id);
                                        const disabled = existingBudget
                                            ? existingBudget.category_id !== cat.id
                                            : alreadyBudgeted;
                                        const selected = categoryId === cat.id;
                                        return (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => { setCategoryId(cat.id); setIsCategoriesExpanded(false); }}
                                                disabled={disabled}
                                                title={!existingBudget && alreadyBudgeted ? `${cat.name} ya tiene un presupuesto` : undefined}
                                                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all ${selected
                                                        ? 'bg-primary'
                                                        : 'hover:bg-muted bg-card'
                                                    } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                                            >
                                                <div
                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${selected ? 'scale-105' : ''}`}
                                                    style={{ backgroundColor: cat.color ? `${cat.color}25` : 'var(--muted)' }}
                                                >
                                                    <CategoryIcon name={cat.icon} className="w-5 h-5" style={{ color: cat.color || 'var(--muted-foreground)' }} />
                                                </div>
                                                <span className={`w-full truncate text-center text-[10px] font-semibold leading-tight ${selected ? 'text-primary-foreground' : 'text-foreground'}`}>
                                                    {cat.name}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Savings toggle */}
                    <button
                        type="button"
                        onClick={() => setIsSavings(!isSavings)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${isSavings ? 'border-secondary-500 bg-secondary-500/10' : 'border-border bg-muted/60'
                            }`}
                    >
                        <div className="flex items-center gap-2 text-left">
                            <PiggyBank className={`w-4 h-4 shrink-0 ${isSavings ? 'text-secondary-600 dark:text-secondary-400' : 'text-muted-foreground'}`} />
                            <span className={`text-xs font-bold ${isSavings ? 'text-secondary-700 dark:text-secondary-400' : 'text-muted-foreground'}`}>Es ahorro</span>
                        </div>
                        <div className={`w-9 h-5 rounded-full relative shrink-0 transition-colors ${isSavings ? 'bg-secondary-500' : 'bg-muted'}`}>
                            <div className={`w-4 h-4 bg-card rounded-full absolute top-0.5 transition-all ${isSavings ? 'left-4' : 'left-0.5'}`} />
                        </div>
                    </button>
                    {isSavings && (
                        <p className="text-[10px] text-muted-foreground -mt-2 px-1">Se resta del ingreso, pero no cuenta como gasto ni consume el colchón.</p>
                    )}

                    {/* Amount Input */}
                    <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                            {isSavings ? 'Objetivo de Ahorro Mensual' : 'Límite Mensual'}
                        </label>
                        <NumericInput
                            value={amount}
                            onValueChange={setAmount}
                            placeholder="0,00"
                            autoFocus
                            wrapperClassName="w-full"
                            className="h-auto border-none bg-transparent p-0 pr-6 text-3xl font-black text-foreground shadow-none focus-visible:ring-0"
                        />
                        {showSuggestion && (
                            <button
                                type="button"
                                onClick={() => setAmount(Math.round(suggestedAverage!).toString())}
                                className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 text-violet-600 text-[11px] font-semibold hover:bg-violet-100 transition-colors"
                            >
                                <Sparkles className="w-3 h-3" />
                                Sugerido {fmt(suggestedAverage!)} (media real)
                            </button>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-3 border-t border-border pb-[max(0.25rem,env(safe-area-inset-bottom))]">
                        {existingBudget && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={loading}
                                className="p-3 rounded-xl bg-accent-500/10 text-accent-500 dark:text-accent-400 hover:bg-accent-500/20 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={loading || !categoryId || !amount}
                            className="flex-1 bg-primary text-primary-foreground font-bold text-sm py-3 rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    <span>Guardar</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
