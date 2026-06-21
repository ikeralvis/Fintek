'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, CreditCard, Tag, ArrowUpRight, ArrowDownRight, ArrowRight } from 'lucide-react';
import { useDashboard } from '@/lib/DashboardContext';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import CategoryIcon from '@/components/ui/CategoryIcon';

type Result = {
  type: 'transaction' | 'account' | 'category' | 'page';
  id: string;
  title: string;
  subtitle?: string;
  href?: string;
  icon?: string;
  color?: string;
  amount?: number;
  txType?: string;
};

const PAGES = [
  { id: 'dashboard', title: 'Dashboard', href: '/dashboard' },
  { id: 'transacciones', title: 'Transacciones', href: '/dashboard/transacciones' },
  { id: 'estadisticas', title: 'Estadísticas', href: '/dashboard/estadisticas' },
  { id: 'cuentas', title: 'Mis Cuentas', href: '/dashboard/cuentas' },
  { id: 'inversiones', title: 'Inversiones', href: '/dashboard/inversiones' },
  { id: 'presupuestos', title: 'Presupuestos', href: '/dashboard/presupuestos' },
  { id: 'suscripciones', title: 'Suscripciones', href: '/dashboard/suscripciones' },
  { id: 'analisis', title: 'Predicción IA', href: '/dashboard/analisis' },
  { id: 'configuracion', title: 'Configuración', href: '/dashboard/configuracion' },
  { id: 'nueva', title: 'Nueva Transacción', href: '/dashboard/transacciones/nueva' },
];

export default function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { transactions, accounts, categories } = useDashboard();

  // Cmd+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const results = useMemo((): Result[] => {
    if (!query.trim()) {
      return PAGES.map(p => ({ type: 'page' as const, id: p.id, title: p.title, href: p.href }));
    }

    const q = query.toLowerCase();
    const items: Result[] = [];

    // Pages
    PAGES.filter(p => p.title.toLowerCase().includes(q)).forEach(p => {
      items.push({ type: 'page', id: p.id, title: p.title, href: p.href });
    });

    // Accounts
    accounts.filter(a => a.name.toLowerCase().includes(q) || a.banks?.name?.toLowerCase().includes(q))
      .slice(0, 3).forEach(a => {
        items.push({
          type: 'account', id: a.id, title: a.name,
          subtitle: `${a.banks?.name || 'Cuenta'} · ${a.current_balance.toLocaleString('es-ES')}€`,
          href: `/dashboard/cuentas/${a.id}`,
          color: a.banks?.color,
        });
      });

    // Categories
    categories.filter(c => c.name.toLowerCase().includes(q))
      .slice(0, 3).forEach(c => {
        items.push({
          type: 'category', id: c.id, title: c.name,
          icon: c.icon, color: c.color,
        });
      });

    // Transactions
    transactions.filter(t =>
      t.description?.toLowerCase().includes(q) ||
      t.categories?.name?.toLowerCase().includes(q) ||
      t.amount.toString().includes(q)
    ).slice(0, 5).forEach(t => {
      items.push({
        type: 'transaction', id: t.id,
        title: t.categories?.name || t.description || 'Transacción',
        subtitle: `${format(parseISO(t.transaction_date), 'd MMM yyyy', { locale: es })} · ${t.description || ''}`,
        amount: t.amount, txType: t.type,
        icon: t.categories?.icon, color: t.categories?.color,
      });
    });

    return items;
  }, [query, transactions, accounts, categories]);

  const handleSelect = (result: Result) => {
    setOpen(false);
    if (result.href) {
      router.push(result.href);
    } else if (result.type === 'transaction') {
      router.push('/dashboard/transacciones');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      handleSelect(results[selectedIdx]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden animate-fade-in">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-100">
          <Search className="w-5 h-5 text-neutral-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar transacciones, cuentas, páginas..."
            className="flex-1 text-sm text-neutral-900 placeholder-neutral-400 outline-none bg-transparent"
          />
          <kbd className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-mono font-medium text-neutral-400 bg-neutral-100 rounded border border-neutral-200">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto py-2">
          {results.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-neutral-400">
              Sin resultados para "{query}"
            </div>
          )}

          {results.map((result, idx) => (
            <button
              key={`${result.type}-${result.id}`}
              onClick={() => handleSelect(result)}
              onMouseEnter={() => setSelectedIdx(idx)}
              className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors ${
                idx === selectedIdx ? 'bg-neutral-50' : ''
              }`}
            >
              {/* Icon */}
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: result.color ? `${result.color}15` : '#f5f5f5' }}>
                {result.type === 'transaction' ? (
                  result.icon ? (
                    <CategoryIcon name={result.icon} className="w-4 h-4" style={{ color: result.color || '#666' }} />
                  ) : result.txType === 'income' ? (
                    <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-rose-500" />
                  )
                ) : result.type === 'account' ? (
                  <CreditCard className="w-4 h-4" style={{ color: result.color || '#666' }} />
                ) : result.type === 'category' ? (
                  <CategoryIcon name={result.icon} className="w-4 h-4" style={{ color: result.color || '#666' }} />
                ) : (
                  <ArrowRight className="w-4 h-4 text-neutral-400" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">{result.title}</p>
                {result.subtitle && (
                  <p className="text-xs text-neutral-400 truncate">{result.subtitle}</p>
                )}
              </div>

              {/* Amount for transactions */}
              {result.amount && (
                <span className={`text-sm font-semibold shrink-0 ${
                  result.txType === 'income' ? 'text-emerald-600' : 'text-neutral-900'
                }`}>
                  {result.txType === 'income' ? '+' : '-'}{result.amount.toLocaleString('es-ES')}€
                </span>
              )}

              {/* Type badge */}
              <span className="text-[10px] font-medium text-neutral-300 uppercase shrink-0">
                {result.type === 'page' ? 'Página' : result.type === 'account' ? 'Cuenta' : result.type === 'category' ? 'Categoría' : ''}
              </span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-neutral-100 flex items-center gap-4 text-[10px] text-neutral-400">
          <span>↑↓ Navegar</span>
          <span>↵ Seleccionar</span>
          <span>ESC Cerrar</span>
          <span className="ml-auto">⌘K para buscar</span>
        </div>
      </div>
    </div>
  );
}
