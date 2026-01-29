'use client';

import { useState } from 'react';
import { Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { deleteTransaction } from '@/lib/actions/transactions';
import { formatCurrency, formatDate } from '@/lib/utils';
import CategoryIcon from '@/components/ui/CategoryIcon';

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
    icon?: string;
    color?: string;
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
  const catColor = transaction.categories?.color || (isIncome ? '#10b981' : '#f43f5e');
  const catIcon = transaction.categories?.icon || (isIncome ? 'trending-up' : 'trending-down');

  return (
    <div className="group flex items-center gap-4 bg-white p-4 rounded-2xl border border-neutral-100 hover:border-neutral-200 hover:shadow-sm transition-all">
      {/* Category Icon */}
      <div 
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${catColor}15` }}
      >
        <CategoryIcon name={catIcon} className="w-5 h-5" style={{ color: catColor }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-neutral-900 truncate text-sm">
            {transaction.description || transaction.categories?.name || 'Sin descripción'}
          </h3>
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-500">
          <span className="truncate">{transaction.categories?.name || 'Sin categoría'}</span>
          <span>•</span>
          <span className="truncate">{transaction.accounts.name}</span>
          <span>•</span>
          <span>{formatDate(transaction.transaction_date)}</span>
        </div>
      </div>

      {/* Amount */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="text-right">
          <p className={`font-bold text-sm ${isIncome ? 'text-emerald-600' : 'text-neutral-900'}`}>
            {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
          </p>
        </div>
        
        {/* Trend indicator */}
        <div className={`p-1.5 rounded-lg ${isIncome ? 'bg-emerald-50' : 'bg-neutral-100'}`}>
          {isIncome ? (
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5 text-neutral-500" />
          )}
        </div>
      </div>

      {/* Delete Button - appears on hover */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-all disabled:opacity-50 shrink-0"
        title="Eliminar transacción"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}