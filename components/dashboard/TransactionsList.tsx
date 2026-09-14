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
      <div className="bg-card rounded-xl shadow-soft p-12 text-center">
        <Receipt className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">
          No hay transacciones
        </h3>
        <p className="text-muted-foreground">
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
      <div className="bg-card rounded-xl shadow-soft p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">
          📊 Resumen ({transactions.length} transacciones)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Ingresos</p>
            <p className="text-2xl font-bold text-green-600">
              {new Intl.NumberFormat('es-ES', {
                style: 'currency',
                currency: 'EUR',
              }).format(totalIncome)}
            </p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Gastos</p>
            <p className="text-2xl font-bold text-red-600">
              {new Intl.NumberFormat('es-ES', {
                style: 'currency',
                currency: 'EUR',
              }).format(totalExpense)}
            </p>
          </div>
          <div className={`${balance >= 0 ? 'bg-green-50' : 'bg-red-50'} rounded-lg p-4`}>
            <p className="text-sm text-muted-foreground mb-1">Balance</p>
            <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
        <h3 className="text-lg font-bold text-foreground mb-4">Todas las Transacciones</h3>
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <TransactionItem key={transaction.id} transaction={transaction} />
          ))}
        </div>
      </div>
    </div>
  );
}