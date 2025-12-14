'use client';

import { formatCurrency } from '@/lib/utils';

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

type CategoryTotals = {
  [category: string]: {
    income: number;
    expense: number;
    balance: number;
  };
};

type Props = {
  monthlyData: MonthlyData;
  categoryTotals: CategoryTotals;
};

const monthNames = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

export default function MonthlyCategoryTable({ monthlyData, categoryTotals }: Props) {
  const categories = Object.keys(categoryTotals).sort((a, b) =>
    Math.abs(categoryTotals[b].balance) - Math.abs(categoryTotals[a].balance)
  );

  if (categories.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-soft p-12 text-center">
        <p className="text-neutral-500">No hay datos para mostrar</p>
      </div>
    );
  }

  // Calcular totales mensuales
  const monthlyTotals = Array.from({ length: 12 }, (_, month) => {
    const balance = monthlyData[month].income - monthlyData[month].expense;
    return balance;
  });

  const yearTotal = monthlyTotals.reduce((sum, val) => sum + val, 0);

  return (
    <div className="bg-white rounded-xl shadow-soft overflow-hidden">
      <div className="p-6 border-b border-neutral-200">
        <h3 className="text-lg font-bold text-neutral-900">
          📅 Balance Mensual por Categoría
        </h3>
        <p className="text-sm text-neutral-600 mt-1">
          Ingresos - Gastos por cada categoría
        </p>
      </div>

      {/* Tabla con scroll horizontal en móvil */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="sticky left-0 bg-neutral-50 z-10 px-4 py-3 text-left font-semibold text-neutral-700 min-w-[150px]">
                Categoría
              </th>
              {monthNames.map((month) => (
                <th key={month} className="px-3 py-3 text-right font-semibold text-neutral-700 min-w-[80px]">
                  {month}
                </th>
              ))}
              <th className="px-4 py-3 text-right font-semibold text-neutral-700 min-w-[100px] bg-neutral-100">
                Total Año
              </th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category, idx) => {
              const isEven = idx % 2 === 0;
              return (
                <tr
                  key={category}
                  className={`border-b border-neutral-100 hover:bg-neutral-50 transition-colors ${isEven ? 'bg-white' : 'bg-neutral-25'
                    }`}
                >
                  <td className="sticky left-0 bg-inherit z-10 px-4 py-3 font-medium text-neutral-900">
                    {category}
                  </td>
                  {Array.from({ length: 12 }).map((_, month) => {
                    const categoryData = monthlyData[month].categories[category];
                    const balance = categoryData
                      ? categoryData.income - categoryData.expense
                      : 0;

                    return (
                      <td
                        key={month}
                        className={`px-3 py-3 text-right ${balance > 0
                            ? 'text-emerald-600 font-semibold'
                            : balance < 0
                              ? 'text-red-600 font-semibold'
                              : 'text-neutral-400'
                          }`}
                      >
                        {balance !== 0
                          ? formatCurrency(balance)
                          : '-'}
                      </td>
                    );
                  })}
                  <td
                    className={`px-4 py-3 text-right font-bold bg-neutral-50 ${categoryTotals[category].balance > 0
                        ? 'text-secondary-700'
                        : categoryTotals[category].balance < 0
                          ? 'text-accent-700'
                          : 'text-neutral-500'
                      }`}
                  >
                    {formatCurrency(categoryTotals[category].balance)}
                  </td>
                </tr>
              );
            })}

            {/* Fila de Totales */}
            <tr className="bg-neutral-100 font-bold">
              <td className="sticky left-0 bg-neutral-100 z-10 px-4 py-3 text-neutral-900">
                TOTAL
              </td>
              {monthlyTotals.map((total, month) => (
                <td
                  key={month}
                  className={`px-3 py-3 text-right ${total > 0
                      ? 'text-secondary-700'
                      : total < 0
                        ? 'text-accent-700'
                        : 'text-neutral-500'
                    }`}
                >
                  {formatCurrency(total)}
                </td>
              ))}
              <td
                className={`px-4 py-3 text-right ${yearTotal > 0
                    ? 'text-secondary-800'
                    : yearTotal < 0
                      ? 'text-accent-800'
                      : 'text-neutral-700'
                  }`}
              >
                {formatCurrency(yearTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Leyenda móvil */}
      <div className="p-4 bg-neutral-50 border-t border-neutral-200 text-xs text-neutral-600">
        💡 <strong>Tip:</strong> Desliza horizontalmente para ver todos los meses
      </div>
    </div>
  );
}