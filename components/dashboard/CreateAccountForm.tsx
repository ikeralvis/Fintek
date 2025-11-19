'use client';

import { useState } from 'react';
import { Plus, X, AlertCircle } from 'lucide-react';
import { createAccount } from '@/lib/actions/accounts';

type Bank = {
  id: string;
  name: string;
};

type Props = {
  banks: Bank[];
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

    const balance = parseFloat(formData.initialBalance);
    if (isNaN(balance)) {
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
      <div className="bg-accent-50 border border-accent-200 rounded-xl p-6 text-center">
        <AlertCircle className="h-12 w-12 text-accent-600 mx-auto mb-3" />
        <h3 className="font-semibold text-neutral-900 mb-2">No tienes bancos configurados</h3>
        <p className="text-sm text-neutral-600 mb-4">
          Antes de crear una cuenta, debes añadir al menos un banco en Configuración.
        </p>
        
        <a
          href="/dashboard/configuracion"
          style={{
            backgroundColor: '#0073ea',
            color: 'white',
            padding: '0.5rem 1.5rem',
            borderRadius: '0.5rem',
            fontWeight: '600',
            display: 'inline-block',
            textDecoration: 'none',
          }}
        >
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
          style={{
            backgroundColor: '#0073ea',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.75rem',
            fontWeight: '600',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            width: '100%',
            justifyContent: 'center',
          }}
          className="hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Nueva Cuenta
        </button>
      ) : (
        <div className="bg-white rounded-xl shadow-medium p-6 border-2 border-primary-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-neutral-900">Nueva Cuenta Bancaria</h3>
            <button
              onClick={() => {
                setIsOpen(false);
                setError('');
                setFormData({ bankId: '', name: '', initialBalance: '' });
              }}
              className="text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-accent-50 border border-accent-200 rounded-lg p-3 flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-accent-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-accent-800">{error}</p>
              </div>
            )}

            {/* Banco */}
            <div>
              <label htmlFor="bankId" className="block text-sm font-medium text-neutral-700 mb-2">
                Banco *
              </label>
              <select
                id="bankId"
                name="bankId"
                value={formData.bankId}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white text-neutral-900"
              >
                <option value="">Selecciona un banco</option>
                {banks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Nombre de Cuenta */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-2">
                Nombre de la Cuenta *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Ej: Cuenta Principal, Ahorros, Nómina..."
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white text-neutral-900"
              />
            </div>

            {/* Saldo Inicial */}
            <div>
              <label htmlFor="initialBalance" className="block text-sm font-medium text-neutral-700 mb-2">
                Saldo Inicial *
              </label>
              <div className="relative">
                <input
                  id="initialBalance"
                  name="initialBalance"
                  type="number"
                  step="0.01"
                  value={formData.initialBalance}
                  onChange={handleChange}
                  required
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 pr-12 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white text-neutral-900"
                />
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-neutral-500">
                  €
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                El saldo actual con el que comienza esta cuenta
              </p>
            </div>

            {/* Botones */}
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setError('');
                  setFormData({ bankId: '', name: '', initialBalance: '' });
                }}
                className="flex-1 px-4 py-2.5 border border-neutral-300 rounded-lg font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  backgroundColor: loading ? '#94a3b8' : '#0073ea',
                  color: 'white',
                  padding: '0.625rem 1rem',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  flex: 1,
                }}
              >
                {loading ? 'Creando...' : 'Crear Cuenta'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}