'use client';

import { useState } from 'react';
import { Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { deleteTransaction } from '@/lib/actions/transactions';
import { formatCurrency, formatDate } from '@/lib/utils';

type Transaction = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string | null;
  transaction_date: string;
  accounts: {
    id: string;
    name: string;
    banks: {
      id: string;
      name: string;
    };
  };
  categories: {
    id: string;
    name: string;
  } | null;
};

type Props = {
  transaction: Transaction;
};

export default function TransactionItem({ transaction }: Props) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de eliminar esta transacción?')) {
      return;
    }

    setDeleting(true);
    const result = await deleteTransaction(transaction.id);

    if (result.error) {
      alert(result.error);
      setDeleting(false);
    }
  };

  const isIncome = transaction.type === 'income';
  const amountColor = isIncome ? 'text-secondary-600' : 'text-accent-600';
  const bgColor = isIncome ? 'bg-secondary-50' : 'bg-accent-50';
  const borderColor = isIncome ? 'border-secondary-200' : 'border-accent-200';

  return (
    <div
      className={`${bgColor} ${borderColor} border rounded-xl p-4 hover:shadow-soft transition-all`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: Icon & Info */}
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          {/* Icon */}
          <div className={`${isIncome ? 'bg-secondary-100' : 'bg-accent-100'} rounded-full p-2 shrink-0`}>
            {isIncome ? (
              <TrendingUp className={`h-5 w-5 ${amountColor}`} />
            ) : (
              <TrendingDown className={`h-5 w-5 ${amountColor}`} />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-neutral-900 truncate">
                {transaction.description || transaction.categories?.name || 'Sin descripción'}
              </h3>
              <span className={`font-bold text-lg ${amountColor} whitespace-nowrap`}>
                {isIncome ? '+' : '-'}
                {formatCurrency(transaction.amount)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-600">
              <span className="bg-white px-2 py-0.5 rounded-full text-xs font-medium">
                {transaction.categories?.name || 'Sin categoría'}
              </span>
              <span>•</span>
              <span>
                {transaction.accounts.name} ({transaction.accounts.banks.name})
              </span>
              <span>•</span>
              <span>{formatDate(transaction.transaction_date)}</span>
            </div>

            {transaction.description && transaction.categories && (
              <p className="text-xs text-neutral-500 mt-1 italic truncate">
                {transaction.description}
              </p>
            )}
          </div>
        </div>

        {/* Right: Delete Button */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-accent-500 hover:text-accent-700 p-2 rounded-lg hover:bg-white transition-colors disabled:opacity-50 shrink-0"
          title="Eliminar transacción"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}