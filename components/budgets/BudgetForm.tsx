'use client';

import { useState } from 'react';
import { Plus, AlertCircle } from 'lucide-react';
import { createBudget } from '@/lib/actions/budgets';

type Category = {
    id: string;
    name: string;
};

type Props = {
    categories: Category[];
};

export default function BudgetForm({ categories }: Props) {
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

        const amount = parseFloat(formData.amount);
        if (isNaN(amount) || amount <= 0) {
            setError('El importe debe ser mayor a 0');
            return;
        }

        setLoading(true);

        const data = new FormData();
        data.append('category_id', formData.categoryId);
        data.append('amount', formData.amount);

        const result = await createBudget(data);

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
            <div className="bg-accent-50 border border-accent-200 rounded-xl p-6 mb-6">
                <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-accent-600 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-neutral-900 mb-1">No hay categorías</h3>
                        <p className="text-sm text-neutral-600 mb-3">
                            Necesitas crear categorías antes de definir presupuestos.
                        </p>
                        <a
                            href="/dashboard/configuracion"
                            className="text-sm font-medium text-primary-600 hover:text-primary-700"
                        >
                            Ir a Configuración →
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-soft p-6 mb-8">
            <h2 className="text-lg font-bold text-neutral-900 mb-4">➕ Nuevo Presupuesto</h2>

            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
                {error && (
                    <div className="w-full md:w-auto bg-accent-50 border border-accent-200 rounded-lg p-3 flex items-start space-x-2 mb-4 md:mb-0">
                        <AlertCircle className="h-4 w-4 text-accent-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-accent-800">{error}</p>
                    </div>
                )}

                {/* Categoría */}
                <div className="w-full md:flex-1">
                    <label htmlFor="categoryId" className="block text-sm font-medium text-neutral-700 mb-1">
                        Categoría *
                    </label>
                    <select
                        id="categoryId"
                        name="categoryId"
                        value={formData.categoryId}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white text-neutral-900"
                    >
                        <option value="">Seleccionar...</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Importe */}
                <div className="w-full md:w-48">
                    <label htmlFor="amount" className="block text-sm font-medium text-neutral-700 mb-1">
                        Límite Mensual *
                    </label>
                    <div className="relative">
                        <input
                            id="amount"
                            name="amount"
                            type="number"
                            step="0.01"
                            value={formData.amount}
                            onChange={handleChange}
                            required
                            placeholder="0.00"
                            className="w-full px-3 py-2 pr-8 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white text-neutral-900"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500 text-sm">
                            €
                        </span>
                    </div>
                </div>

                {/* Botón Submit */}
                <button
                    type="submit"
                    disabled={loading}
                    className={`
            w-full md:w-auto px-6 py-2 rounded-lg font-semibold text-white flex items-center justify-center gap-2 transition-colors
            ${loading ? 'bg-neutral-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'}
          `}
                >
                    <Plus className="h-4 w-4" />
                    {loading ? 'Guardando...' : 'Guardar'}
                </button>
            </form>
        </div>
    );
}
