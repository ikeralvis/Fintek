'use client';

import { useState } from 'react';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';

type Account = {
  id: string;
  name: string;
  banks: { name: string };
};

type Category = {
  id: string;
  name: string;
};

type Props = {
  accounts: Account[];
  categories: Category[];
  onFilterChange: (filters: {
    type?: 'income' | 'expense';
    accountId?: string;
    categoryId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => void;
};

export default function TransactionFilters({ accounts, categories, onFilterChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    accountId: '',
    categoryId: '',
    dateFrom: '',
    dateTo: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const newFilters = {
      ...filters,
      [e.target.name]: e.target.value,
    };
    setFilters(newFilters);
  };

  const handleApply = () => {
    const activeFilters: any = {};
    
    if (filters.type) activeFilters.type = filters.type;
    if (filters.accountId) activeFilters.accountId = filters.accountId;
    if (filters.categoryId) activeFilters.categoryId = filters.categoryId;
    if (filters.dateFrom) activeFilters.dateFrom = filters.dateFrom;
    if (filters.dateTo) activeFilters.dateTo = filters.dateTo;

    onFilterChange(activeFilters);
  };

  const handleClear = () => {
    const emptyFilters = {
      type: '',
      accountId: '',
      categoryId: '',
      dateFrom: '',
      dateTo: '',
    };
    setFilters(emptyFilters);
    onFilterChange({});
  };

  const activeFiltersCount = Object.values(filters).filter(v => v !== '').length;

  return (
    <div className="bg-white rounded-xl shadow-soft overflow-hidden">
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <Filter className="h-5 w-5 text-primary-600" />
          <span className="font-semibold text-neutral-900">Filtros</span>
          {activeFiltersCount > 0 && (
            <span className="bg-primary-100 text-primary-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-neutral-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-neutral-400" />
        )}
      </button>

      {/* Filters Content - Collapsible */}
      {isOpen && (
        <div className="p-4 pt-0 border-t border-neutral-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            {/* Tipo */}
            <div>
              <label htmlFor="filter-type" className="block text-sm font-medium text-neutral-700 mb-1">
                Tipo
              </label>
              <select
                id="filter-type"
                name="type"
                value={filters.type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white text-neutral-900 text-sm"
              >
                <option value="">Todos</option>
                <option value="expense">💸 Gastos</option>
                <option value="income">💰 Ingresos</option>
              </select>
            </div>

            {/* Cuenta */}
            <div>
              <label htmlFor="filter-account" className="block text-sm font-medium text-neutral-700 mb-1">
                Cuenta
              </label>
              <select
                id="filter-account"
                name="accountId"
                value={filters.accountId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white text-neutral-900 text-sm"
              >
                <option value="">Todas</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Categoría */}
            <div>
              <label htmlFor="filter-category" className="block text-sm font-medium text-neutral-700 mb-1">
                Categoría
              </label>
              <select
                id="filter-category"
                name="categoryId"
                value={filters.categoryId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white text-neutral-900 text-sm"
              >
                <option value="">Todas</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha Desde */}
            <div>
              <label htmlFor="filter-dateFrom" className="block text-sm font-medium text-neutral-700 mb-1">
                Desde
              </label>
              <input
                id="filter-dateFrom"
                name="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white text-neutral-900 text-sm"
              />
            </div>

            {/* Fecha Hasta */}
            <div>
              <label htmlFor="filter-dateTo" className="block text-sm font-medium text-neutral-700 mb-1">
                Hasta
              </label>
              <input
                id="filter-dateTo"
                name="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white text-neutral-900 text-sm"
              />
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClear}
              className="px-4 py-2 border border-neutral-300 rounded-lg font-medium text-neutral-700 hover:bg-neutral-50 transition-colors text-sm flex items-center space-x-2"
            >
              <X className="h-4 w-4" />
              <span>Limpiar</span>
            </button>
            <button
              onClick={handleApply}
              style={{
                backgroundColor: '#0073ea',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
              }}
              className="hover:bg-primary-700 transition-colors"
            >
              <Filter className="h-4 w-4" />
              <span>Aplicar</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}