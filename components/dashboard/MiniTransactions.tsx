"use client";

import React from 'react';

export default function MiniTransactions({ transactions }: { transactions: Array<any> }) {
  return (
    <div className="bg-white rounded-xl shadow-soft p-6">
      <h3 className="text-sm font-medium text-neutral-600 mb-3">Últimas transacciones</h3>
      <ul className="space-y-3">
        {transactions.slice(0, 6).map((t: any) => (
          <li key={t.id} className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-neutral-900">{t.categories?.name || 'Sin categoría'}</div>
              <div className="text-xs text-neutral-500">{new Date(t.transaction_date).toLocaleDateString('es-ES')}</div>
            </div>
            <div className={`font-semibold ${t.type === 'income' ? 'text-secondary-600' : 'text-accent-600'}`}>
              {t.type === 'income' ? '+' : '-'}{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(t.amount)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
