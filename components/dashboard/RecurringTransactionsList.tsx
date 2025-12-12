'use client';

import { useState } from 'react';
import { createRecurringTransaction, deleteRecurringTransaction, processRecurringTransaction } from '@/lib/actions/recurring';
import { Plus, Trash2, RefreshCw, Calendar, Play } from 'lucide-react';

type Props = {
    recurringTransactions: any[];
    accounts: any[];
    categories: any[];
};

export default function RecurringTransactionsList({ recurringTransactions, accounts, categories }: Readonly<Props>) {
    const [isCreating, setIsCreating] = useState(false);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        type: 'expense',
        accountId: '',
        categoryId: '',
        amount: '',
        description: '',
        frequency: 'monthly',
        startDate: new Date().toISOString().split('T')[0],
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.accountId || !formData.categoryId || !formData.amount) return;

        const result = await createRecurringTransaction({
            type: formData.type as 'income' | 'expense',
            accountId: formData.accountId,
            categoryId: formData.categoryId,
            amount: Number.parseFloat(formData.amount),
            description: formData.description,
            frequency: formData.frequency as 'monthly' | 'weekly' | 'yearly',
            startDate: formData.startDate,
        });

        if (result.error) {
            alert(result.error);
            return;
        }

        setIsCreating(false);
        setFormData({
            type: 'expense',
            accountId: '',
            categoryId: '',
            amount: '',
            description: '',
            frequency: 'monthly',
            startDate: new Date().toISOString().split('T')[0],
        });
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar esta transacción recurrente?')) {
            await deleteRecurringTransaction(id);
        }
    };

    const handleProcessNow = async (id: string) => {
        setIsProcessing(id);
        const result = await processRecurringTransaction(id);
        setIsProcessing(null);
        if (result.error) {
            alert(result.error);
        } else {
            alert('Transacción procesada correctamente');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-neutral-900">Transacciones Recurrentes</h2>
                <button
                    onClick={() => setIsCreating(!isCreating)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Nueva Recurrente
                </button>
            </div>

            {isCreating && (
                <div className="bg-white p-6 rounded-xl shadow-soft border border-neutral-100 animate-in fade-in slide-in-from-top-4">
                    <h3 className="font-semibold mb-4">Nueva Transacción Recurrente</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="recurring-type" className="block text-sm font-medium text-neutral-700 mb-1">Tipo</label>
                                <select
                                    id="recurring-type"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full p-2 border border-neutral-200 rounded-lg"
                                >
                                    <option value="expense">Gasto</option>
                                    <option value="income">Ingreso</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="recurring-frequency" className="block text-sm font-medium text-neutral-700 mb-1">Frecuencia</label>
                                <select
                                    id="recurring-frequency"
                                    value={formData.frequency}
                                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                                    className="w-full p-2 border border-neutral-200 rounded-lg"
                                >
                                    <option value="weekly">Semanal</option>
                                    <option value="monthly">Mensual</option>
                                    <option value="yearly">Anual</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="recurring-account" className="block text-sm font-medium text-neutral-700 mb-1">Cuenta</label>
                                <select
                                    id="recurring-account"
                                    value={formData.accountId}
                                    onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                                    className="w-full p-2 border border-neutral-200 rounded-lg"
                                    required
                                >
                                    <option value="">Seleccionar cuenta</option>
                                    {accounts.map((acc) => (
                                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="recurring-category" className="block text-sm font-medium text-neutral-700 mb-1">Categoría</label>
                                <select
                                    id="recurring-category"
                                    value={formData.categoryId}
                                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                    className="w-full p-2 border border-neutral-200 rounded-lg"
                                    required
                                >
                                    <option value="">Seleccionar categoría</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="recurring-amount" className="block text-sm font-medium text-neutral-700 mb-1">Importe</label>
                                <input
                                    id="recurring-amount"
                                    type="number"
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className="w-full p-2 border border-neutral-200 rounded-lg"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="recurring-start-date" className="block text-sm font-medium text-neutral-700 mb-1">Fecha de Inicio</label>
                                <input
                                    id="recurring-start-date"
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    className="w-full p-2 border border-neutral-200 rounded-lg"
                                    required
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label htmlFor="recurring-description" className="block text-sm font-medium text-neutral-700 mb-1">Descripción</label>
                                <input
                                    id="recurring-description"
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full p-2 border border-neutral-200 rounded-lg"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                            >
                                Guardar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-soft overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-neutral-50 border-b border-neutral-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Descripción</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Frecuencia</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Importe</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Próxima Ejecución</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200">
                            {recurringTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                                        No hay transacciones recurrentes configuradas
                                    </td>
                                </tr>
                            ) : (
                                recurringTransactions.map((rt) => (
                                    <tr key={rt.id} className="hover:bg-neutral-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-full ${rt.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                    <RefreshCw className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-neutral-900">{rt.description || 'Sin descripción'}</p>
                                                    <p className="text-xs text-neutral-500">{rt.categories?.name} • {rt.accounts?.name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                                                {rt.frequency === 'monthly' ? 'Mensual' : rt.frequency === 'weekly' ? 'Semanal' : 'Anual'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-neutral-900">
                                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(rt.amount)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-neutral-600">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-neutral-400" />
                                                {new Date(rt.next_run_date).toLocaleDateString('es-ES')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleProcessNow(rt.id)}
                                                    disabled={isProcessing === rt.id}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Ejecutar ahora"
                                                >
                                                    <Play className={`h-4 w-4 ${isProcessing === rt.id ? 'animate-pulse' : ''}`} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(rt.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
