"use client";

import React from 'react';
import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis } from 'recharts';

type Monthly = { month: string; income: number; expense: number };

const monthNames = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const monthIndex = parseInt(label.split('-')[1]) - 1;
    const monthName = monthNames[monthIndex];
    return (
      <div className="bg-white border border-neutral-200 rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-neutral-900">{monthName}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.dataKey === 'income' ? 'Ingreso' : 'Gasto'}: {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardWidgets({ totalBalance, monthlyIncome, monthlyExpense, monthlySeries }: { totalBalance: number; monthlyIncome: number; monthlyExpense: number; monthlySeries: Monthly[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white rounded-xl shadow-soft p-6">
        <h3 className="text-sm font-medium text-neutral-600">Patrimonio Total</h3>
        <p className="text-2xl font-bold text-primary-600 mt-2">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalBalance)}</p>
      </div>

      <div className="bg-white rounded-xl shadow-soft p-6">
        <h3 className="text-sm font-medium text-neutral-600">Ingresos (mes)</h3>
        <p className="text-2xl font-bold text-secondary-600 mt-2">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(monthlyIncome)}</p>
        <div className="h-16 mt-3">
          <ResponsiveContainer width="100%" height={50}>
            <AreaChart data={monthlySeries} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#6b7280' }}
                tickFormatter={(value) => {
                  const monthIndex = parseInt(value.split('-')[1]) - 1;
                  return monthNames[monthIndex];
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="income" stroke="#10b981" fill="#bbf7d0" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-soft p-6">
        <h3 className="text-sm font-medium text-neutral-600">Gastos (mes)</h3>
        <p className="text-2xl font-bold text-accent-600 mt-2">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(monthlyExpense)}</p>
        <div className="h-16 mt-3">
          <ResponsiveContainer width="100%" height={50}>
            <AreaChart data={monthlySeries} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#6b7280' }}
                tickFormatter={(value) => {
                  const monthIndex = parseInt(value.split('-')[1]) - 1;
                  return monthNames[monthIndex];
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="#fecaca" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
