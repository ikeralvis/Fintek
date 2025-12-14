'use client';

import { useState } from 'react';
import { Plus, AlertCircle, Calendar, Tag, Wallet, FileText } from 'lucide-react';
import { createRecurringTransaction } from '@/lib/actions/recurring';

type Account = {
    id: string;
    name: string;
    banks: { name: string };
};

type Category = {
    id: string;
    name: string;
    banks?: { name: string };
};

type Props = {
    accounts: Account[];
    categories: Category[];
};

export default function SubscriptionForm({ accounts, categories }: Readonly<Props>) {
    const today = new Date().toISOString().split('T')[0];

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        accountId: '',
        categoryId: '',
        amount: '',
        description: '',
        frequency: 'monthly' as 'monthly' | 'yearly' | 'weekly',
        startDate: today,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.accountId) {
            setError('Selecciona una cuenta de pago');
            return;
        }

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

        const result = await createRecurringTransaction({
            type: 'expense',
            accountId: formData.accountId,
            categoryId: formData.categoryId,
            amount,
            description: formData.description.trim() || undefined,
            frequency: formData.frequency,
            startDate: formData.startDate,
        });

        if (result.error) {
            setError(result.error);
            setLoading(false);
        } else {
            setFormData({
                accountId: formData.accountId,
                categoryId: '',
                amount: '',
                description: '',
                frequency: 'monthly',
                startDate: today,
            });
            setLoading(false);
        }
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    if (accounts.length === 0 || categories.length === 0) {
        return (
            <div className="bg-accent-50 border border-accent-200 rounded-2xl p-6 mb-6">
                <div className="flex items-start space-x-3">
                    <AlertCircle className="h-6 w-6 text-accent-600 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-bold text-neutral-900 mb-1 text-lg">Configuración incompleta</h3>
                        <p className="text-neutral-600 mb-4">
                            Para crear suscripciones necesitas tener cuentas y categorías.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white/50 backdrop-blur-sm rounded-3xl p-1">
            <form onSubmit={handleSubmit} className="space-y-8">
                {error && (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center space-x-3 animate-fade-in">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <p className="text-sm font-medium text-red-800">{error}</p>
                    </div>
                )}

                {/* 1. Selector de Frecuencia (Segmented Control) */}
                <div className="grid grid-cols-3 gap-2 p-1 bg-neutral-100/80 rounded-2xl">
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, frequency: 'monthly' })}
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm sm:text-base transition-all duration-200 ${formData.frequency === 'monthly'
                            ? 'bg-white text-violet-600 shadow-sm ring-1 ring-black/5'
                            : 'text-neutral-500 hover:bg-neutral-200/50'
                            }`}
                    >
                        Mensual
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, frequency: 'weekly' })}
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm sm:text-base transition-all duration-200 ${formData.frequency === 'weekly'
                            ? 'bg-white text-violet-600 shadow-sm ring-1 ring-black/5'
                            : 'text-neutral-500 hover:bg-neutral-200/50'
                            }`}
                    >
                        Semanal
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, frequency: 'yearly' })}
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm sm:text-base transition-all duration-200 ${formData.frequency === 'yearly'
                            ? 'bg-white text-violet-600 shadow-sm ring-1 ring-black/5'
                            : 'text-neutral-500 hover:bg-neutral-200/50'
                            }`}
                    >
                        Anual
                    </button>
                </div>

                {/* 2. Input de Cantidad Gigante */}
                <div className="text-center">
                    <label htmlFor="amount" className="block text-sm font-medium text-neutral-400 uppercase tracking-wider mb-2">Importe Recurrente</label>
                    <div className="relative inline-block max-w-[200px] sm:max-w-xs mx-auto">
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-4xl font-bold text-violet-500">€</span>
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

                {/* 3. Nombre del Servicio */}
                <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-neutral-500 ml-1">
                        <FileText className="h-4 w-4 mr-2" /> Nombre del Servicio
                    </label>
                    <input
                        id="description"
                        name="description"
                        type="text"
                        required
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Ej: Netflix, Spotify..."
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-5 py-4 text-xl font-medium text-neutral-900 focus:ring-4 focus:ring-violet-100 focus:border-violet-500 transition-all placeholder-neutral-400"
                    />
                </div>

                {/* 4. Grid de Campos (Cuenta y Categoría) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="flex items-center text-sm font-medium text-neutral-500 ml-1">
                            <Wallet className="h-4 w-4 mr-2" /> Cuenta de Pago
                        </label>
                        <div className="relative">
                            <select
                                id="accountId"
                                name="accountId"
                                value={formData.accountId}
                                onChange={handleChange}
                                required
                                className="w-full appearance-none bg-neutral-50 border border-neutral-200 rounded-2xl px-5 py-4 text-lg font-medium text-neutral-900 focus:ring-4 focus:ring-violet-100 focus:border-violet-500 transition-all cursor-pointer hover:bg-neutral-100"
                            >
                                <option value="">Seleccionar...</option>
                                {accounts.map((account) => (
                                    <option key={account.id} value={account.id}>
                                        {account.name} · {account.banks.name}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-neutral-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="flex items-center text-sm font-medium text-neutral-500 ml-1">
                            <Tag className="h-4 w-4 mr-2" /> Categoría
                        </label>
                        <div className="relative">
                            <select
                                id="categoryId"
                                name="categoryId"
                                value={formData.categoryId}
                                onChange={handleChange}
                                required
                                className="w-full appearance-none bg-neutral-50 border border-neutral-200 rounded-2xl px-5 py-4 text-lg font-medium text-neutral-900 focus:ring-4 focus:ring-violet-100 focus:border-violet-500 transition-all cursor-pointer hover:bg-neutral-100"
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
                </div>

                {/* 5. Próximo Cobro */}
                <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-neutral-500 ml-1">
                        <Calendar className="h-4 w-4 mr-2" /> Fecha Próximo Cobro
                    </label>
                    <input
                        id="startDate"
                        name="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={handleChange}
                        required
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-5 py-4 text-base font-medium text-neutral-900 focus:ring-4 focus:ring-violet-100 focus:border-violet-500 transition-all"
                    />
                </div>

                {/* Botón Submit */}
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-5 rounded-2xl text-xl font-bold text-white shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 ${loading ? 'bg-neutral-400 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-500'
                            }`}
                    >
                        {loading ? (
                            <span className="animate-pulse">Guardando...</span>
                        ) : (
                            <>
                                <Plus className="h-6 w-6" />
                                Añadir Suscripción
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
