'use client';

import { useState } from 'react';
import { Plus, AlertCircle } from 'lucide-react';
import { createTransaction } from '@/lib/actions/transactions';

type Account = {
  id: string;
  name: string;
  banks: { name: string };
};

type Category = {
  id: string;
  name: string;
};

type Props = {
  accounts: Account[];
  categories: Category[];
};

export default function TransactionForm({ accounts, categories }: Props) {
  const today = new Date().toISOString().split('T')[0];
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    type: 'expense' as 'income' | 'expense',
    accountId: '',
    categoryId: '',
    amount: '',
    description: '',
    transactionDate: today,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.accountId) {
      setError('Selecciona una cuenta');
      return;
    }

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

    console.log('Submitting transaction:', {
      type: formData.type,
      accountId: formData.accountId,
      categoryId: formData.categoryId,
      amount,
      description: formData.description.trim() || undefined,
      transactionDate: formData.transactionDate,
    });

    const result = await createTransaction({
      type: formData.type,
      accountId: formData.accountId,
      categoryId: formData.categoryId,
      amount,
      description: formData.description.trim() || undefined,
      transactionDate: formData.transactionDate,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      // Resetear formulario
      setFormData({
        type: 'expense',
        accountId: formData.accountId, // Mantener cuenta seleccionada
        categoryId: '',
        amount: '',
        description: '',
        transactionDate: today,
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
      <div className="bg-accent-50 border border-accent-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-accent-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-neutral-900 mb-1">Configuración incompleta</h3>
            <p className="text-sm text-neutral-600 mb-3">
              {accounts.length === 0 && 'No tienes cuentas creadas. '}
              {categories.length === 0 && 'No tienes categorías creadas. '}
              Configura esto antes de registrar transacciones.
            </p>
            <div className="flex space-x-3">
              {accounts.length === 0 && (
                <a
                  href="/dashboard/cuentas"
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  Crear Cuenta →
                </a>
              )}
              {categories.length === 0 && (
                <a
                  href="/dashboard/configuracion"
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  Añadir Categorías →
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-soft p-6">
      <h2 className="text-lg font-bold text-neutral-900 mb-4">➕ Nueva Transacción</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-accent-50 border border-accent-200 rounded-lg p-3 flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-accent-600 shrink-0 mt-0.5" />
            <p className="text-sm text-accent-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Tipo */}
          <div className="lg:col-span-1">
            <label htmlFor="type" className="block text-sm font-medium text-neutral-700 mb-1">
              Tipo *
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white text-neutral-900"
            >
              <option value="expense">💸 Gasto</option>
              <option value="income">💰 Ingreso</option>
            </select>
          </div>

          {/* Cuenta */}
          <div className="lg:col-span-2">
            <label htmlFor="accountId" className="block text-sm font-medium text-neutral-700 mb-1">
              Cuenta *
            </label>
            <select
              id="accountId"
              name="accountId"
              value={formData.accountId}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white text-neutral-900"
            >
              <option value="">Seleccionar...</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.banks.name})
                </option>
              ))}
            </select>
          </div>

          {/* Categoría */}
          <div className="lg:col-span-2">
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
          <div className="lg:col-span-1">
            <label htmlFor="amount" className="block text-sm font-medium text-neutral-700 mb-1">
              Importe *
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Fecha */}
          <div>
            <label htmlFor="transactionDate" className="block text-sm font-medium text-neutral-700 mb-1">
              Fecha *
            </label>
            <input
              id="transactionDate"
              name="transactionDate"
              type="date"
              value={formData.transactionDate}
              onChange={handleChange}
              required
              max={today}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white text-neutral-900"
            />
          </div>

          {/* Descripción */}
          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-neutral-700 mb-1">
              Descripción (opcional)
            </label>
            <input
              id="description"
              name="description"
              type="text"
              value={formData.description}
              onChange={handleChange}
              placeholder="Ej: Compra en Mercadona, Gasolina..."
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white text-neutral-900"
            />
          </div>
        </div>

        {/* Botón Submit */}
        <button
          type="submit"
          disabled={loading}
          style={{
            backgroundColor: loading ? '#94a3b8' : '#0073ea',
            color: 'white',
            padding: '0.625rem 1.5rem',
            borderRadius: '0.5rem',
            fontWeight: '600',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginLeft: 'auto',
          }}
        >
          <Plus className="h-4 w-4" />
          {loading ? 'Añadiendo...' : 'Añadir Transacción'}
        </button>
      </form>
    </div>
  );
}