'use client';

import { useState, useEffect } from 'react';
import { X, Trash2, Check, PiggyBank, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { upsertBudget, deleteBudget } from '@/lib/actions/budgets';
import CategoryIcon from '@/components/ui/CategoryIcon';

const fmt = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

export default function BudgetFormModal({
    isOpen,
    onClose,
    categories,
    existingBudget,
    averageByCategory = {},
}: {
    isOpen: boolean;
    onClose: () => void;
    categories: any[];
    existingBudget?: any; // If passed, we are editing
    averageByCategory?: Record<string, number>;
}) {
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [isSavings, setIsSavings] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (existingBudget) {
                setAmount(existingBudget.amount.toString());
                setCategoryId(existingBudget.category_id);
                setIsSavings(!!existingBudget.is_savings);
            } else {
                setAmount('');
                setCategoryId('');
                setIsSavings(false);
            }
        }
    }, [isOpen, existingBudget]);

    if (!isOpen) return null;

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-xs bg-card rounded-3xl p-5 shadow-2xl animate-fade-in-up">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-foreground">
                        {existingBudget ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
                    </h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-full text-muted-foreground">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Category Select */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Categoría</label>
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                            {categories.map((cat) => {
                                const disabled = !!existingBudget && existingBudget.category_id !== cat.id;
                                const selected = categoryId === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setCategoryId(cat.id)}
                                        disabled={disabled}
                                        className={`px-2.5 py-1.5 rounded-full border flex items-center gap-1.5 transition-all ${selected
                                                ? 'border-primary bg-primary text-primary-foreground'
                                                : 'border-border bg-card hover:bg-muted/60 text-muted-foreground'
                                            } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                                    >
                                        <CategoryIcon name={cat.icon} className="w-3.5 h-3.5 shrink-0" />
                                        <span className="text-[11px] font-semibold whitespace-nowrap">{cat.name}</span>
                                    </button>
                                );
                            })}
                        </div>
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
                        <div className="relative">
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full text-3xl font-black text-foreground bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-muted-foreground/60 p-0"
                                autoFocus
                            />
                            <span className="absolute top-1/2 -translate-y-1/2 right-0 text-lg font-bold text-muted-foreground">€</span>
                        </div>
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
                    <div className="flex gap-2 pt-3 border-t border-border">
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
                                <span className="animate-spin text-base">⏳</span>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    <span>Guardar</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
