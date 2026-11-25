'use client';

import Link from 'next/link';
import { PiggyBank } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { goalProgress, type GoalPocket } from '@/lib/savingsGoals';

/** Apartados con objetivo: progreso y cuánto apartar al mes para llegar a tiempo. */
export default function GoalsWidget({ goals }: { goals: GoalPocket[] | null }) {
  if (!goals) return <div className="h-[140px] rounded-2xl bg-card border border-border animate-pulse" aria-busy="true" />;

  const items = goals
    .map(p => ({ p, g: goalProgress(p) }))
    .filter((x): x is { p: GoalPocket; g: NonNullable<ReturnType<typeof goalProgress>> } => !!x.g)
    // Primero los que están en marcha, los conseguidos al final.
    .sort((a, b) => Number(a.g.done) - Number(b.g.done) || b.g.pct - a.g.pct)
    .slice(0, 3);

  return (
    <section className="bg-card rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">Tus objetivos</h2>
        <Link href="/dashboard/cuentas" className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
          Apartados
        </Link>
      </div>

      {items.length === 0 ? (
        <Link href="/dashboard/cuentas" className="flex items-center gap-3 p-3 -m-1 rounded-xl hover:bg-muted/60 transition-colors">
          <span className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <PiggyBank className="w-5 h-5 text-muted-foreground" />
          </span>
          <span className="text-sm text-muted-foreground">Crea un apartado con objetivo (un viaje, un colchón…) y sigue aquí cuánto te falta.</span>
        </Link>
      ) : (
        <div className="space-y-3.5">
          {items.map(({ p, g }) => (
            <Link
              key={p.id}
              href={p.account_id ? `/dashboard/cuentas/${p.account_id}/apartados` : '/dashboard/cuentas'}
              className="block -mx-2 px-2 py-1 rounded-xl hover:bg-muted/60 transition-colors"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-foreground truncate">{p.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  <span className="text-foreground font-semibold">{formatCurrency(Number(p.balance))}</span> / {formatCurrency(Number(p.target_amount))}
                </span>
              </div>
              <div className="h-2 mt-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${g.pct}%`, backgroundColor: p.color }} />
              </div>
              <p className={cn('text-[11px] mt-1 tabular-nums', g.done ? 'text-secondary-600 dark:text-secondary-400 font-semibold' : g.overdue ? 'text-accent-600 dark:text-accent-400' : 'text-muted-foreground')}>
                {g.done
                  ? '¡Objetivo conseguido!'
                  : g.overdue
                    ? `Te faltan ${formatCurrency(g.remaining)} y la fecha ya pasó`
                    : g.perMonth !== null
                      ? `${formatCurrency(g.perMonth)}/mes hasta ${g.dateLabel}`
                      : `Te faltan ${formatCurrency(g.remaining)}`}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
