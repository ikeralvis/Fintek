'use client';

import { useState, useEffect } from 'react';
import { Plus, AlertCircle, ArrowUpCircle, ArrowDownCircle, Calendar, FileText, Wallet, Tag } from 'lucide-react';
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

export default function TransactionForm({ accounts, categories }: Readonly<Props>) {
  const today = new Date().toISOString().split('T')[0];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const defaultForm = {
    type: 'expense' as 'income' | 'expense',
    accountId: '',
    categoryId: '',
    amount: '',
    description: '',
    transactionDate: today,
  };

  const [formData, setFormData] = useState(() => {
    try {
      if (globalThis.window === undefined) return defaultForm;
      const saved = localStorage.getItem('transactionFormDraft');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaultForm, ...parsed };
      }
    } catch (e) {
      // Log parse errors and fall back to default
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error parsing transactionFormDraft from localStorage:', e);
      }
    }
    return defaultForm;
  });

  // Save to localStorage on change
  useEffect(() => {
    const handler = setTimeout(() => {
      localStorage.setItem('transactionFormDraft', JSON.stringify(formData));
    }, 500); // Debounce saves
    return () => clearTimeout(handler);
  }, [formData]);

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

    const amount = Number.parseFloat(formData.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      setError('El importe debe ser mayor a 0');
      return;
    }

    setLoading(true);

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
      // Clear draft on success
      localStorage.removeItem('transactionFormDraft');

      setFormData({
        type: 'expense',
        accountId: formData.accountId, // Keep account selected for convenience? Or reset? Logic said reset.
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
      <div className="bg-accent-50 border border-accent-200 rounded-2xl p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-6 w-6 text-accent-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-neutral-900 mb-1 text-lg">Configuración incompleta</h3>
            <p className="text-neutral-600 mb-4">
              Para comenzar, necesitas configurar tus cuentas y categorías.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              {accounts.length === 0 && (
                <a href="/dashboard/cuentas" className="bg-primary-600 text-white px-4 py-2 rounded-xl text-center font-medium hover:bg-primary-700 transition-colors">
                  Crear Cuenta
                </a>
              )}
              {categories.length === 0 && (
                <a href="/dashboard/configuracion" className="bg-neutral-900 text-white px-4 py-2 rounded-xl text-center font-medium hover:bg-neutral-800 transition-colors">
                  Añadir Categorías
                </a>
              )}
            </div>
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

        {/* 1. Selector de Tipo (Segmented Control Grande) */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100/80 rounded-2xl">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, type: 'expense' })}
            className={`flex items-center justify-center gap-2 py-4 rounded-xl text-lg font-bold transition-all duration-200 ${formData.type === 'expense'
              ? 'bg-white text-accent-600 shadow-sm ring-1 ring-black/5'
              : 'text-neutral-500 hover:bg-neutral-200/50'
              }`}
          >
            <ArrowDownCircle className={`h-6 w-6 ${formData.type === 'expense' ? 'text-accent-500' : 'text-neutral-400'}`} />
            Gasto
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, type: 'income' })}
            className={`flex items-center justify-center gap-2 py-4 rounded-xl text-lg font-bold transition-all duration-200 ${formData.type === 'income'
              ? 'bg-white text-secondary-600 shadow-sm ring-1 ring-black/5'
              : 'text-neutral-500 hover:bg-neutral-200/50'
              }`}
          >
            <ArrowUpCircle className={`h-6 w-6 ${formData.type === 'income' ? 'text-secondary-500' : 'text-neutral-400'}`} />
            Ingreso
          </button>
        </div>

        {/* 2. Input de Cantidad Gigante */}
        <div className="text-center">
          <label htmlFor="amount" className="block text-sm font-medium text-neutral-400 uppercase tracking-wider mb-2">Importe</label>
          <div className="relative inline-block max-w-[200px] sm:max-w-xs mx-auto">
            <span className={`absolute left-0 top-1/2 -translate-y-1/2 text-4xl font-bold ${formData.type === 'expense' ? 'text-accent-500' : 'text-secondary-500'}`}>€</span>
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

        {/* 3. Grid de Campos (Cuenta y Categoría) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-neutral-500 ml-1">
              <Wallet className="h-4 w-4 mr-2" /> Cuenta
            </label>
            <div className="relative">
              <select
                id="accountId"
                name="accountId"
                value={formData.accountId}
                onChange={handleChange}
                required
                className="w-full appearance-none bg-neutral-50 border border-neutral-200 rounded-2xl px-5 py-4 text-lg font-medium text-neutral-900 focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all cursor-pointer hover:bg-neutral-100"
              >
                <option value="">Seleccionar cuenta...</option>
                {(() => {
                  // Group accounts by bank
                  const groupedAccounts = accounts.reduce((acc, account) => {
                    const bankName = account.banks?.name || 'Otros';
                    if (!acc[bankName]) acc[bankName] = [];
                    acc[bankName].push(account);
                    return acc;
                  }, {} as Record<string, typeof accounts>);

                  return Object.entries(groupedAccounts).map(([bankName, bankAccounts]) => (
                    <optgroup key={bankName} label={bankName}>
                      {bankAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </optgroup>
                  ));
                })()}
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
                className="w-full appearance-none bg-neutral-50 border border-neutral-200 rounded-2xl px-5 py-4 text-lg font-medium text-neutral-900 focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all cursor-pointer hover:bg-neutral-100"
              >
                <option value="">Seleccionar categoría...</option>
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

        {/* 4. Fecha y Detalles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-neutral-500 ml-1">
              <Calendar className="h-4 w-4 mr-2" /> Fecha
            </label>
            <input
              type="date"
              name="transactionDate"
              value={formData.transactionDate}
              onChange={handleChange}
              required
              className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-5 py-4 text-base font-medium text-neutral-900 focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-neutral-500 ml-1">
              <FileText className="h-4 w-4 mr-2" /> Nota (Opcional)
            </label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="¿En qué gastaste?"
              className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-5 py-4 text-base font-medium text-neutral-900 focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all placeholder-neutral-400"
            />
          </div>
        </div>

        {/* 5. Botón de Acción Masivo */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-5 rounded-2xl text-xl font-bold text-white shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 ${loading
              ? 'bg-neutral-400 cursor-not-allowed'
              : formData.type === 'expense'
                ? 'bg-neutral-900 hover:bg-neutral-800'
                : 'bg-primary-600 hover:bg-primary-500'
              }`}
          >
            {loading ? (
              <span className="animate-pulse">Guardando...</span>
            ) : (
              <>
                <Plus className="h-6 w-6" />
                {formData.type === 'expense' ? 'Registrar Gasto' : 'Registrar Ingreso'}
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}