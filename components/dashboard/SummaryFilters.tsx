'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Filter } from 'lucide-react';

type Category = {
  id: string;
  name: string;
};

type Props = {
  availableYears: number[];
  categories: Category[];
  currentYear: number;
  currentCategoryId?: string;
};

export default function SummaryFilters({
  availableYears,
  categories,
  currentYear,
  currentCategoryId,
}: Props) {
  const router = useRouter();
  const [year, setYear] = useState(currentYear.toString());
  const [categoryId, setCategoryId] = useState(currentCategoryId || '');

  const handleApply = () => {
    const params = new URLSearchParams();
    params.set('year', year);
    if (categoryId) params.set('categoryId', categoryId);

    router.push(`/dashboard/resumen?${params.toString()}`);
  };

  return (
    <div className="bg-white rounded-xl shadow-soft p-6">
      <div className="flex items-center space-x-3 mb-4">
        <Filter className="h-5 w-5 text-primary-600" />
        <h3 className="font-semibold text-neutral-900">Filtros</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Año */}
        <div>
          <label htmlFor="year" className="block text-sm font-medium text-neutral-700 mb-1">
            Año
          </label>
          <div className="relative">
            <select
              id="year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white text-neutral-900 appearance-none"
            >
              {availableYears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              <svg
            className="h-4 w-4 text-neutral-400"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
              >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>
        </div>

        {/* Categoría */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-neutral-700 mb-1">
            Categoría (opcional)
          </label>
          <div className="relative">
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white text-neutral-900 appearance-none"
            >
              <option value="">Todas las categorías</option>
              {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              <svg
            className="h-4 w-4 text-neutral-400"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
              >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>
        </div>

        {/* Botón Aplicar */}
        <div className="flex items-end">
          <button
            onClick={handleApply}
            style={{
              backgroundColor: '#0073ea',
              color: 'white',
              padding: '0.5rem 1.5rem',
              borderRadius: '0.5rem',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
            }}
            className="hover:bg-primary-700 transition-colors"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}