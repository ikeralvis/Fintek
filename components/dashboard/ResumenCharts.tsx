"use client";

import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';

type Monthly = { month: string; income: number; expense: number; net: number };
type CategorySeries = { id: string; name: string; monthly: Monthly[] };

export default function ResumenCharts({ monthlyTotals, categories }: { monthlyTotals: Monthly[]; categories: CategorySeries[] }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categories[0]?.id || null);

  const categoryData = useMemo(() => categories.find((c) => c.id === selectedCategory) ?? null, [categories, selectedCategory]);

  return (
    <div className="space-y-6">
      <div className="h-80 bg-white rounded-lg p-4 shadow-sm">
        <h3 className="font-semibold mb-2">Ingresos / Gastos por mes</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyTotals} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="income" stackId="a" fill="#10b981" />
            <Bar dataKey="expense" stackId="a" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-4 shadow-sm h-72">
          <h3 className="font-semibold mb-2">Balance neto</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyTotals} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm h-72">
          <h3 className="font-semibold mb-2">Por categoría (serie mensual)</h3>
          <div className="mb-2">
            <select className="border rounded px-2 py-1" value={selectedCategory ?? ''} onChange={(e) => setSelectedCategory(e.target.value || null)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {categoryData ? (
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={categoryData.monthly} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="net" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-neutral-600">Selecciona una categoría</p>
          )}
        </div>
      </div>
    </div>
  );
}
