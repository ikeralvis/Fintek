"use client";

import React from 'react';
import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis } from 'recharts';

type Monthly = { month: string; income: number; expense: number };

const monthNames = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    const monthIndex = Number.parseInt(label.split('-')[1]) - 1;
    const monthName = monthNames[monthIndex];
    return (
      <div className="bg-white border border-neutral-200 rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-neutral-900">{monthName}</p>
        {payload.map((entry: any) => (
          <p key={entry.dataKey} style={{ color: entry.color }}>
            {entry.dataKey === 'income' ? 'Ingreso' : 'Gasto'}: {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

type DashboardWidgetsProps = Readonly<{
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlySeries: Monthly[];
}>;

export default function DashboardWidgets({ totalBalance, monthlyIncome, monthlyExpense, monthlySeries }: DashboardWidgetsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Patrimonio Total - Bento Card Large */}
      <div className="bg-linear-to-r from-blue-900 to-indigo-900 rounded-3xl p-6 shadow-strong hover:shadow-xl transition-all duration-300 relative overflow-hidden group border border-blue-800">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-10 -translate-y-1/2 translate-x-1/2"></div>
        <h3 className="text-sm font-semibold text-blue-200 uppercase tracking-wider relative z-10">Patrimonio Total</h3>
        <p className="text-4xl font-bold text-white mt-2 tracking-tight relative z-10">
          {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalBalance)}
        </p>
      </div>

      {/* Ahorro Mensual */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200/60 shadow-card hover:shadow-medium transition-shadow duration-300 relative overflow-hidden">
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">Ahorro Mensual</h3>
        <div className="flex items-baseline mt-2">
          <p className={`text-4xl font-bold tracking-tight ${monthlyIncome - monthlyExpense >= 0 ? 'text-secondary-600' : 'text-accent-600'}`}>
            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(monthlyIncome - monthlyExpense)}
          </p>
        </div>
        <div className="mt-4 w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${monthlyIncome - monthlyExpense >= 0 ? 'bg-secondary-500' : 'bg-accent-500'}`}
            style={{ width: `${monthlyIncome > 0 ? Math.min(Math.max(((monthlyIncome - monthlyExpense) / monthlyIncome) * 100, 0), 100) : 0}%` }}
          ></div>
        </div>
      </div>

      {/* Ingresos vs Gastos Mini-Cards */}
      <div className="grid grid-rows-2 gap-4">
        {/* Ingresos */}
        <div className="bg-white rounded-3xl p-5 border border-neutral-200/60 shadow-card flex justify-between items-center relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary-400"></div>
          <div>
            <h3 className="text-xs font-semibold text-neutral-500 uppercase mb-1">Ingresos</h3>
            <p className="text-xl font-bold text-neutral-900">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(monthlyIncome)}</p>
          </div>
          <div className="h-10 w-10 bg-secondary-50 rounded-full flex items-center justify-center text-secondary-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
          </div>
        </div>

        {/* Gastos */}
        <div className="bg-white rounded-3xl p-5 border border-neutral-200/60 shadow-card flex justify-between items-center relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent-400"></div>
          <div>
            <h3 className="text-xs font-semibold text-neutral-500 uppercase mb-1">Gastos</h3>
            <p className="text-xl font-bold text-neutral-900">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(monthlyExpense)}</p>
          </div>
          <div className="h-10 w-10 bg-accent-50 rounded-full flex items-center justify-center text-accent-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"></path></svg>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="col-span-1 md:col-span-3 bg-white rounded-3xl shadow-card border border-neutral-200/60 p-6">
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-6">Evolución Anual</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlySeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#a1a1aa' }}
                tickFormatter={(value) => {
                  const monthIndex = Number.parseInt(value.split('-')[1]) - 1;
                  return monthNames[monthIndex];
                }}
                dy={10}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="income"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorIncome)"
              />
              <Area
                type="monotone"
                dataKey="expense"
                stroke="#ef4444"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorExpense)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
