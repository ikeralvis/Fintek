'use client';

import { useState } from 'react';
import { Plus, X, AlertCircle, Building2, Wallet } from 'lucide-react';
import { createAccount } from '@/lib/actions/accounts';

type Bank = {
  id: string;
  name: string;
};

type Props = {
  readonly banks: ReadonlyArray<Bank>;
};

export default function CreateAccountForm({ banks }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    bankId: '',
    name: '',
    initialBalance: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.bankId) {
      setError('Selecciona un banco');
      return;
    }

    if (!formData.name.trim()) {
      setError('El nombre de la cuenta es obligatorio');
      return;
    }

    const balance = Number.parseFloat(formData.initialBalance);
    if (Number.isNaN(balance)) {
      setError('El saldo inicial debe ser un número válido');
      return;
    }

    setLoading(true);

    const result = await createAccount({
      bankId: formData.bankId,
      name: formData.name.trim(),
      initialBalance: balance,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      // Éxito - resetear formulario
      setFormData({ bankId: '', name: '', initialBalance: '' });
      setIsOpen(false);
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (banks.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
        <Building2 className="h-12 w-12 text-blue-500 mx-auto mb-3" />
        <h3 className="font-bold text-neutral-900 mb-2">No tienes bancos configurados</h3>
        <p className="text-sm text-neutral-600 mb-4">
          Antes de crear una cuenta, debes añadir al menos un banco.
        </p>

        <a href="/dashboard/configuracion" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors">
          Ir a Configuración
        </a>
      </div>
    );
  }

  return (
    <div>
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full bg-gradient-to-r from-primary-600 to-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Plus className="h-6 w-6" />
          Nueva Cuenta
        </button>
      ) : (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-strong w-full max-w-lg overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-neutral-100">
              <h3 className="text-xl font-bold text-neutral-900">Nueva Cuenta</h3>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setError('');
                  setFormData({ bankId: '', name: '', initialBalance: '' });
                }}
                className="p-2 rounded-full hover:bg-neutral-100 transition-colors"
              >
                <X className="h-6 w-6 text-neutral-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8">
              {error && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              )}

              {/* 1. Saldo Inicial Gigante */}
              <div className="text-center">
                <label htmlFor="initialBalance" className="block text-sm font-medium text-neutral-400 uppercase tracking-wider mb-2">Saldo Inicial</label>
                <div className="relative inline-block max-w-[200px] mx-auto">
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 text-4xl font-bold text-blue-500">€</span>
                  <input
                    id="initialBalance"
                    name="initialBalance"
                    type="number"
                    step="0.01"
                    value={formData.initialBalance}
                    onChange={handleChange}
                    required
                    placeholder="0.00"
                    className="w-full bg-transparent text-center text-6xl font-black focus:outline-none placeholder-neutral-200 p-2 text-neutral-900"
                  />
                </div>
              </div>

              {/* 2. Grid de Campos */}
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-neutral-500 ml-1">
                    <Building2 className="h-4 w-4 mr-2" /> Banco
                  </label>
                  <div className="relative">
                    <select
                      id="bankId"
                      name="bankId"
                      value={formData.bankId}
                      onChange={handleChange}
                      required
                      className="w-full appearance-none bg-neutral-50 border border-neutral-200 rounded-2xl px-5 py-4 text-lg font-medium text-neutral-900 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all cursor-pointer hover:bg-neutral-100"
                    >
                      <option value="">Selecciona un banco...</option>
                      {banks.map((bank) => (
                        <option key={bank.id} value={bank.id}>
                          {bank.name}
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
                    <Wallet className="h-4 w-4 mr-2" /> Nombre de la Cuenta
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Ej: Ahorros, Nómina..."
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-5 py-4 text-lg font-medium text-neutral-900 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all placeholder-neutral-400"
                  />
                </div>
              </div>

              {/* Botón Submit */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 rounded-2xl text-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-3 ${loading ? 'bg-neutral-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 hover:shadow-xl active:scale-[0.98]'
                  }`}
              >
                {loading ? 'Creando...' : 'Crear Cuenta'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}