'use client';

import { useState } from 'react';
import { Building2, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { deleteAccount } from '@/lib/actions/accounts';
import { formatCurrency } from '@/lib/utils';

type Account = {
  id: string;
  name: string;
  initial_balance: number;
  current_balance: number;
  banks: {
    id: string;
    name: string;
  };
};

type Props = {
  readonly account: Account;
  readonly monthlyIncome?: number;
  readonly monthlyExpense?: number;
};

export default function AccountCard({ account, monthlyIncome = 0, monthlyExpense = 0 }: Props) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`¿Estás seguro de eliminar la cuenta "${account.name}"?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    setDeleting(true);
    const result = await deleteAccount(account.id);
    
    if (result.error) {
      alert(result.error);
      setDeleting(false);
    }
    // Si no hay error, la página se recarga automáticamente por revalidatePath
  };

  const balanceColor = account.current_balance >= 0 ? 'text-secondary-600' : 'text-accent-600';
  const balanceBg = account.current_balance >= 0 ? 'bg-secondary-50' : 'bg-accent-50';

  return (
    <div className="bg-white rounded-xl shadow-soft hover:shadow-medium transition-all p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <Building2 className="h-5 w-5 text-primary-600" />
            <h3 className="font-semibold text-neutral-900">{account.name}</h3>
          </div>
          <p className="text-sm text-neutral-500">{account.banks.name}</p>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-accent-500 hover:text-accent-700 p-2 rounded-lg hover:bg-accent-50 transition-colors disabled:opacity-50"
          title="Eliminar cuenta"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Balance Actual */}
      <div className={`${balanceBg} rounded-lg p-4 mb-4`}>
        <p className="text-sm text-neutral-600 mb-1">Saldo Actual</p>
        <p className={`text-3xl font-bold ${balanceColor}`}>
          {formatCurrency(account.current_balance)}
        </p>
      </div>

      {/* Stats del Mes */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-neutral-50 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <TrendingUp className="h-4 w-4 text-secondary-600" />
            <p className="text-xs text-neutral-600">Ingresos mes</p>
          </div>
          <p className="font-semibold text-secondary-600">
            {formatCurrency(monthlyIncome)}
          </p>
        </div>
        <div className="bg-neutral-50 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <TrendingDown className="h-4 w-4 text-accent-600" />
            <p className="text-xs text-neutral-600">Gastos mes</p>
          </div>
          <p className="font-semibold text-accent-600">
            {formatCurrency(monthlyExpense)}
          </p>
        </div>
      </div>

      {/* Balance Inicial (pequeño) */}
      <div className="mt-3 pt-3 border-t border-neutral-100">
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>Saldo inicial:</span>
          <span className="font-medium">{formatCurrency(account.initial_balance)}</span>
        </div>
      </div>
    </div>
  );
}