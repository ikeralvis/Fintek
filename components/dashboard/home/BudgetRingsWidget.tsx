'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { Target } from 'lucide-react';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { cn, formatCurrency } from '@/lib/utils';
import type { HomeBudget } from '@/lib/useHomeData';
import type { HomeCategory, HomeTx } from '@/lib/homeInsights';

type Props = {
  budgets: HomeBudget[] | null;
  categories: HomeCategory[];
  transactions: HomeTx[];
};

const STATUS = {
  exceeded: { stroke: 'stroke-accent-500', text: 'text-accent-600 dark:text-accent-400' },
  warning: { stroke: 'stroke-amber-400', text: 'text-amber-600 dark:text-amber-400' },
  safe: { stroke: 'stroke-secondary-500', text: 'text-muted-foreground' },
};

/** Los 3 presupuestos de gasto más cerca del límite, como anillos de progreso. */
export default function BudgetRingsWidget({ budgets, categories, transactions }: Props) {
  if (!budgets) return <div className="h-[168px] rounded-2xl bg-card border border-border animate-pulse" aria-busy="true" />;

  const monthPrefix = format(new Date(), 'yyyy-MM');
  // Mismo criterio que la página de Presupuestos: gastos y transferencias con categoría.
  const spentByCat: Record<string, number> = {};
  for (const t of transactions) {
    if ((t.type === 'expense' || t.type === 'transfer') && t.category_id && t.transaction_date.startsWith(monthPrefix)) {
      spentByCat[t.category_id] = (spentByCat[t.category_id] || 0) + Number(t.amount);
    }
  }

  const items = budgets
    .filter(b => !b.is_savings && b.amount > 0)
    .map(b => {
      const category = categories.find(c => c.id === b.category_id);
      const spent = spentByCat[b.category_id] || 0;
      const pct = (spent / b.amount) * 100;
      const status: keyof typeof STATUS = pct > 100 ? 'exceeded' : pct >= 80 ? 'warning' : 'safe';
      return { ...b, category, spent, pct, status, remaining: b.amount - spent };
    })
    .filter(b => b.category)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);

  return (
    <section className="bg-card rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">Presupuestos</h2>
        <Link href="/dashboard/presupuestos" className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
          Ver todo
        </Link>
      </div>

      {items.length === 0 ? (
        <Link href="/dashboard/presupuestos" className="flex items-center gap-3 p-3 -m-1 rounded-xl hover:bg-muted/60 transition-colors">
          <span className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Target className="w-5 h-5 text-muted-foreground" />
          </span>
          <span className="text-sm text-muted-foreground">Pon un límite a tus categorías y te avisamos antes de pasarte.</span>
        </Link>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {items.map(b => {
            const r = 26;
            const c = 2 * Math.PI * r;
            const filled = Math.min(b.pct, 100) / 100;
            return (
              <Link key={b.id} href="/dashboard/presupuestos" className="flex flex-col items-center text-center gap-2 rounded-xl p-1.5 hover:bg-muted/60 transition-colors">
                <span className="relative w-16 h-16">
                  <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90" aria-hidden>
                    <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" className="stroke-muted" />
                    <circle
                      cx="32" cy="32" r={r} fill="none" strokeWidth="6" strokeLinecap="round"
                      className={cn(STATUS[b.status].stroke, 'transition-[stroke-dashoffset] duration-700 ease-out')}
                      strokeDasharray={c}
                      strokeDashoffset={c * (1 - filled)}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center">
                    <CategoryIcon name={b.category!.icon} className="w-5 h-5" style={{ color: b.category!.color || 'var(--muted-foreground)' }} />
                  </span>
                </span>
                <span className="min-w-0 w-full">
                  <span className="block text-xs font-semibold text-foreground truncate">{b.category!.name}</span>
                  <span className={cn('block text-[11px] tabular-nums', STATUS[b.status].text)}>
                    {b.remaining >= 0 ? `Quedan ${formatCurrency(b.remaining)}` : `+${formatCurrency(-b.remaining)}`}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
