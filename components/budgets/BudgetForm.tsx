'use client';

import { useState } from 'react';
import { AlertCircle, Tag, Target } from 'lucide-react';
import { upsertBudget } from '@/lib/actions/budgets';

type Category = {
    id: string;
    name: string;
};

type Props = {
    categories: Category[];
};

export default function BudgetForm({ categories }: Readonly<Props>) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        categoryId: '',
        amount: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.categoryId) {
            setError('Selecciona una categoría');
            return;
        }

        const amount = Number.parseFloat(formData.amount);
        if (Number.isNaN(amount) || amount <= 0) {
            setError('El importe debe ser mayor a 0');
            return;
        }

        setLoading(true);

        const result = await upsertBudget(formData.categoryId, amount);

        if (result.error) {
            setError(result.error);
            setLoading(false);
        } else {
            setFormData({
                categoryId: '',
                amount: '',
            });
            setLoading(false);
        }
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    if (categories.length === 0) {
        return (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6">
                <div className="flex items-start space-x-3">
                    <AlertCircle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-bold text-neutral-900 mb-1">No hay categorías</h3>
                        <p className="text-neutral-600 mb-3">
                            Necesitas crear categorías antes de definir presupuestos.
                        </p>
                        <a href="/dashboard/configuracion" className="inline-block bg-amber-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-amber-600 transition-colors">
                            Ir a Configuración
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white/50 backdrop-blur-sm rounded-3xl p-1 mb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center space-x-3 animate-fade-in">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <p className="text-sm font-medium text-red-800">{error}</p>
                    </div>
                )}

                {/* 1. Input de Cantidad Gigante */}
                <div className="text-center pt-2">
                    <label htmlFor="amount" className="block text-sm font-medium text-neutral-400 uppercase tracking-wider mb-2">Límite Mensual</label>
                    <div className="relative inline-block max-w-[200px] mx-auto">
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-4xl font-bold text-amber-500">€</span>
                        <input
                            id="amount"
                            name="amount"
                            type="number"
                            step="0.01"
                            value={formData.amount}
                            onChange={handleChange}
                            required
                            placeholder="0.00"
                            className="w-full bg-transparent text-center text-6xl font-black focus:outline-none placeholder-neutral-200 p-2 text-neutral-900"
                        />
                    </div>
                </div>

                {/* 2. Selector de Categoría */}
                <div className="max-w-md mx-auto space-y-2">
                    <label className="flex items-center text-sm font-medium text-neutral-500 ml-1">
                        <Tag className="h-4 w-4 mr-2" /> Categoría a Limitar
                    </label>
                    <div className="relative">
                        <select
                            id="categoryId"
                            name="categoryId"
                            value={formData.categoryId}
                            onChange={handleChange}
                            required
                            className="w-full appearance-none bg-neutral-50 border border-neutral-200 rounded-2xl px-5 py-4 text-lg font-medium text-neutral-900 focus:ring-4 focus:ring-amber-100 focus:border-amber-500 transition-all cursor-pointer hover:bg-neutral-100"
                        >
                            <option value="">Seleccionar...</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-neutral-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>

                {/* Botón Submit */}
                <div className="pt-2 max-w-md mx-auto">
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 rounded-2xl text-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-3 ${loading ? 'bg-neutral-400 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600 hover:shadow-xl active:scale-[0.98]'
                            }`}
                    >
                        {loading ? (
                            <span className="animate-pulse">Guardando...</span>
                        ) : (
                            <>
                                <Target className="h-6 w-6" />
                                Definir Objetivo
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
