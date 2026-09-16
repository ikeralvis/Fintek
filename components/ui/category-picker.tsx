'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { groupCategories } from '@/lib/categoryGroups';
import { cn } from '@/lib/utils';

type Category = { id: string; name: string; icon?: string; color?: string };

type Props = {
  categories: Category[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Ids (en orden) de las categorías más usadas/recientes: tira de 1-tap arriba del todo. */
  frequentIds?: string[];
  isDisabled?: (categoryId: string) => boolean;
  disabledTitle?: (categoryId: string) => string | undefined;
  className?: string;
};

/**
 * Selector de categoría reutilizable: buscador rápido + tira de frecuentes + grid agrupado
 * por bloques lógicos (Hogar, Transporte, Ocio, Suministros, Finanzas...). Compartido entre
 * el modal de nueva transacción, edición y presupuestos para no divergir de patrón.
 */
export function CategoryPicker({ categories, selectedId, onSelect, frequentIds = [], isDisabled, disabledTitle, className }: Props) {
  const [query, setQuery] = useState('');

  const frequentCategories = useMemo(
    () => frequentIds.map(id => categories.find(c => c.id === id)).filter((c): c is Category => !!c),
    [frequentIds, categories]
  );
  const groups = useMemo(() => groupCategories(categories, query), [categories, query]);

  return (
    <div className={cn('space-y-3', className)}>
      {categories.length > 8 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar categoría..."
            className="w-full rounded-xl border border-border bg-muted/60 py-2 pl-8 pr-3 text-xs font-medium text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      {!query && frequentCategories.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Frecuentes</p>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-hide">
            {frequentCategories.map(cat => {
              const selected = selectedId === cat.id;
              return (
                <button
                  key={`freq-${cat.id}`}
                  type="button"
                  onClick={() => onSelect(cat.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 transition-all',
                    selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:bg-muted/60'
                  )}
                >
                  <CategoryIcon name={cat.icon} className="h-3.5 w-3.5 shrink-0" />
                  <span className="whitespace-nowrap text-[11px] font-semibold">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="max-h-64 space-y-3 overflow-y-auto pr-0.5">
        {groups.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">Sin resultados</p>
        )}
        {groups.map(({ group, items }) => (
          <div key={group}>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{group}</p>
            <div className="grid grid-cols-4 gap-2">
              {items.map(cat => {
                const selected = selectedId === cat.id;
                const disabled = isDisabled?.(cat.id) ?? false;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => onSelect(cat.id)}
                    disabled={disabled}
                    title={disabledTitle?.(cat.id)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl p-2.5 transition-all',
                      selected ? 'bg-primary' : 'bg-card hover:bg-muted',
                      disabled && 'cursor-not-allowed opacity-40'
                    )}
                  >
                    <div
                      className={cn('flex h-10 w-10 items-center justify-center rounded-xl', selected && 'scale-105')}
                      style={{ backgroundColor: cat.color ? `${cat.color}25` : 'var(--muted)' }}
                    >
                      <CategoryIcon name={cat.icon} className="h-5 w-5" style={{ color: cat.color || 'var(--muted-foreground)' }} />
                    </div>
                    <span className={cn('w-full truncate text-center text-[10px] font-semibold leading-tight', selected ? 'text-primary-foreground' : 'text-foreground')}>
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
