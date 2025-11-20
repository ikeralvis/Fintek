"use client";

import React from 'react';
type Monthly = { month: string; income: number; expense: number; net: number };

export default function CategoryMonthlyTable({ category }: { category: { id: string; name: string; monthly: Monthly[] } | null }) {
  if (!category) return null;

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h3 className="font-semibold mb-3">{category.name} — Serie mensual</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-600">
              <th className="px-2 py-1">Mes</th>
              <th className="px-2 py-1">Ingresos</th>
              <th className="px-2 py-1">Gastos</th>
              <th className="px-2 py-1">Neto</th>
            </tr>
          </thead>
          <tbody>
            {category.monthly.map((m) => (
              <tr key={m.month} className="border-t">
                <td className="px-2 py-1">{m.month}</td>
                <td className="px-2 py-1">{m.income.toFixed(2)}€</td>
                <td className="px-2 py-1">{m.expense.toFixed(2)}€</td>
                <td className="px-2 py-1">{m.net.toFixed(2)}€</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
