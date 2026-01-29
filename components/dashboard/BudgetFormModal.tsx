'use client';

import { useState, useEffect } from 'react';
import { X, Save, Trash2, Check } from 'lucide-react';
import { upsertBudget, deleteBudget } from '@/lib/actions/budgets';

export default function BudgetFormModal({
    isOpen,
    onClose,
    categories,
    existingBudget
}: {
    isOpen: boolean;
    onClose: () => void;
    categories: any[];
    existingBudget?: any; // If passed, we are editing
}) {
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (existingBudget) {
                setAmount(existingBudget.amount.toString());
                setCategoryId(existingBudget.category_id);
            } else {
                setAmount('');
                setCategoryId('');
            }
        }
    }, [isOpen, existingBudget]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!categoryId || !amount) return;

        setLoading(true);
        const res = await upsertBudget(categoryId, parseFloat(amount));
        setLoading(false);

        if (res.success) {
            onClose();
        } else {
            alert('Error al guardar: ' + res.error);
        }
    };

    const handleDelete = async () => {
        if (!existingBudget || !confirm('¿Eliminar este presupuesto?')) return;
        setLoading(true);
        await deleteBudget(existingBudget.id);
        setLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md bg-white rounded-[32px] p-6 shadow-2xl animate-fade-in-up">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-neutral-900">
                        {existingBudget ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full text-neutral-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Category Select */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Categoría</label>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setCategoryId(cat.id)}
                                    disabled={!!existingBudget && existingBudget.category_id !== cat.id} // Disable changing category on edit to simplify logic
                                    className={`p-3 rounded-2xl border flex items-center gap-2 transition-all ${categoryId === cat.id
                                            ? 'border-neutral-900 bg-neutral-900 text-white ring-2 ring-neutral-900 ring-offset-2'
                                            : 'border-neutral-100 bg-white hover:bg-neutral-50 text-neutral-600'
                                        } ${existingBudget && existingBudget.category_id !== cat.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <span>{cat.icon}</span>
                                    <span className="text-xs font-bold truncate">{cat.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Amount Input */}
                    <div>
                        <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-2">Límite Mensual</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full text-4xl font-black text-neutral-900 bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-neutral-200 p-0"
                                autoFocus
                            />
                            <span className="absolute top-1/2 -translate-y-1/2 right-0 text-xl font-bold text-neutral-300">€</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-neutral-100">
                        {existingBudget && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={loading}
                                className="p-4 rounded-2xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={loading || !categoryId || !amount}
                            className="flex-1 bg-neutral-900 text-white font-bold p-4 rounded-2xl hover:bg-neutral-800 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <span className="animate-spin text-xl">⏳</span>
                            ) : (
                                <>
                                    <Check className="w-5 h-5" />
                                    <span>Guardar Límite</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
