'use client';

import { useMemo } from 'react';

type MonthlyData = {
  [month: number]: {
    income: number;
    expense: number;
    categories: {
      [category: string]: {
        income: number;
        expense: number;
      };
    };
  };
};

type Props = {
  readonly monthlyData: MonthlyData;
  readonly className?: string;
};

const monthNames = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

export default function SummaryCharts({ monthlyData, className }: Props) {
  const data = useMemo(() => monthlyData ?? {}, [monthlyData]);

  // Preparar datos para el gráfico de barras
  const barChartData = useMemo(() => {
    return Object.keys(data).map((monthKey) => {
      const month = Number.parseInt(monthKey);
      return {
        month: monthNames[month],
        income: data[month].income,
        expense: data[month].expense,
      };
    });
  }, [data]);

  // Preparar datos para el gráfico de categorías (pie chart simulado con barras horizontales)
  const categoryData = useMemo(() => {
    const categories: { [key: string]: number } = {};

    Object.values(data).forEach((monthData) => {
      Object.entries(monthData.categories).forEach(([category, data]) => {
        if (!categories[category]) {
          categories[category] = 0;
        }
        categories[category] += data.expense;
      });
    });

    return Object.entries(categories)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10); // Top 10 categorías
  }, [data]);

  const maxIncome = Math.max(...barChartData.map(d => d.income), 1);
  const maxExpense = Math.max(...barChartData.map(d => d.expense), 1);
  const maxValue = Math.max(maxIncome, maxExpense);

  const totalCategoryExpense = categoryData.reduce((sum, cat) => sum + cat.amount, 0);

  const colors = [
    '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
  ];

  return (
    <div className={className || "grid grid-cols-1 lg:grid-cols-2 gap-6"}>
      {/* Gráfico de Ingresos vs Gastos Mensuales */}
      <div className="bg-white rounded-xl shadow-soft p-6">
        <h3 className="text-lg font-bold text-neutral-900 mb-6">
          📊 Ingresos vs Gastos Mensuales
        </h3>
        <div className="space-y-4">
          {barChartData.map((data) => {
            const incomeWidth = maxValue > 0 ? (data.income / maxValue) * 100 : 0;
            const expenseWidth = maxValue > 0 ? (data.expense / maxValue) * 100 : 0;

            return (
              <div key={data.month}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-neutral-700 w-12">{data.month}</span>
                  <div className="flex-1 mx-3 space-y-2">
                    {/* Barra de Ingresos */}
                    <div className="relative group">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-emerald-700 font-medium">Ingresos</span>
                        <span className="font-bold text-emerald-700">
                          {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(data.income)}
                        </span>
                      </div>
                      <div className="h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${incomeWidth}%` }}
                        />
                      </div>
                    </div>

                    {/* Barra de Gastos */}
                    <div className="relative group">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-red-700 font-medium">Gastos</span>
                        <span className="font-bold text-red-700">
                          {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(data.expense)}
                        </span>
                      </div>
                      <div className="h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full transition-all duration-500"
                          style={{ width: `${expenseWidth}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center space-x-6 mt-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-emerald-500 rounded"></div>
            <span className="text-neutral-600">Ingresos</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-neutral-600">Gastos</span>
          </div>
        </div>
      </div>

      {/* Gráfico de Gastos por Categoría */}
      <div className="bg-white rounded-xl shadow-soft p-6">
        <h3 className="text-lg font-bold text-neutral-900 mb-6">
          🎯 Top Gastos por Categoría
        </h3>
        <div className="space-y-3">
          {categoryData.length === 0 ? (
            <p className="text-center text-neutral-500 py-8">
              No hay datos de gastos
            </p>
          ) : (
            categoryData.map((category, index) => {
              const percentage = (category.amount / totalCategoryExpense) * 100;

              return (
                <div key={category.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: colors[index % colors.length] }}
                      />
                      <span className="font-medium text-neutral-700 truncate">
                        {category.name}
                      </span>
                    </div>
                    <span className="font-semibold text-neutral-900 ml-2">
                      {new Intl.NumberFormat('es-ES', {
                        style: 'currency',
                        currency: 'EUR',
                        minimumFractionDigits: 0,
                      }).format(category.amount)}
                    </span>
                  </div>
                  <div className="relative h-6 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: colors[index % colors.length],
                      }}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-700">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}