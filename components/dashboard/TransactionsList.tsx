'use client';

import { Receipt } from 'lucide-react';
import TransactionItem from './TransactionItem';

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
  transactions: Transaction[];
};

export default function TransactionsList({ transactions }: Props) {
  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-soft p-12 text-center">
        <Receipt className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-neutral-700 mb-2">
          No hay transacciones
        </h3>
        <p className="text-neutral-500">
          Añade tu primera transacción usando el formulario de arriba
        </p>
      </div>
    );
  }

  // Calcular totales
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="bg-white rounded-xl shadow-soft p-6">
        <h3 className="text-lg font-bold text-neutral-900 mb-4">
          📊 Resumen ({transactions.length} transacciones)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-secondary-50 rounded-lg p-4">
            <p className="text-sm text-neutral-600 mb-1">Total Ingresos</p>
            <p className="text-2xl font-bold text-secondary-600">
              {new Intl.NumberFormat('es-ES', {
                style: 'currency',
                currency: 'EUR',
              }).format(totalIncome)}
            </p>
          </div>
          <div className="bg-accent-50 rounded-lg p-4">
            <p className="text-sm text-neutral-600 mb-1">Total Gastos</p>
            <p className="text-2xl font-bold text-accent-600">
              {new Intl.NumberFormat('es-ES', {
                style: 'currency',
                currency: 'EUR',
              }).format(totalExpense)}
            </p>
          </div>
          <div className={`${balance >= 0 ? 'bg-primary-50' : 'bg-accent-50'} rounded-lg p-4`}>
            <p className="text-sm text-neutral-600 mb-1">Balance</p>
            <p className={`text-2xl font-bold ${balance >= 0 ? 'text-primary-600' : 'text-accent-600'}`}>
              {new Intl.NumberFormat('es-ES', {
                style: 'currency',
                currency: 'EUR',
              }).format(balance)}
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Transacciones */}
      <div>
        <h3 className="text-lg font-bold text-neutral-900 mb-4">Todas las Transacciones</h3>
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <TransactionItem key={transaction.id} transaction={transaction} />
          ))}
        </div>
      </div>
    </div>
  );
}