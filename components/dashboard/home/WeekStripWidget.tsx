'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, formatCurrency } from '@/lib/utils';
import { ServiceLogo } from '@/components/ui/service-logo';
import { matchService, isLightColor } from '@/lib/subscriptionCatalog';
import { upcomingWeek } from '@/lib/homeWidgets';
import type { HomeSubscription } from '@/lib/homeInsights';

/** Color del punto de un cobro en la tira: el de la marca si se reconoce, si no neutro. */
function dotColor(name: string) {
  const s = matchService(name);
  if (!s) return 'var(--muted-foreground)';
  return isLightColor(s.bg) ? s.fg : s.bg;
}

/** Tira con los próximos 7 días: puntos en los días con cobro y el detalle del día elegido. */
export default function WeekStripWidget({ subscriptions }: { subscriptions: HomeSubscription[] | null }) {
  const days = useMemo(() => (subscriptions ? upcomingWeek(subscriptions) : null), [subscriptions]);
  const [picked, setPicked] = useState<string | null>(null);

  if (!days) return <div className="h-[180px] rounded-2xl bg-card border border-border animate-pulse" aria-busy="true" />;

  const firstWithCharges = days.find(d => d.charges.length > 0)?.date ?? days[0].date;
  const selected = days.find(d => d.date === (picked ?? firstWithCharges))!;
  const weekTotal = days.reduce((a, d) => a + d.total, 0);
  const todayKey = days[0].date;

  return (
    <section className="bg-card rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">Próximos 7 días</h2>
        <Link href="/dashboard/suscripciones" className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
          {weekTotal > 0 ? <span className="tabular-nums">{formatCurrency(weekTotal)}</span> : 'Ver todo'}
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1" role="tablist" aria-label="Días">
        {days.map(d => {
          const date = parseISO(d.date);
          const isSel = d.date === selected.date;
          return (
            <button
              key={d.date}
              role="tab"
              aria-selected={isSel}
              aria-label={`${format(date, "EEEE d", { locale: es })}${d.charges.length ? `, ${d.charges.length} cobro${d.charges.length > 1 ? 's' : ''}` : ''}`}
              onClick={() => setPicked(d.date)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl py-2 transition-colors',
                isSel ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              )}
            >
              <span className={cn('text-[10px] font-medium uppercase', isSel ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                {d.date === todayKey ? 'Hoy' : format(date, 'EEEEEE', { locale: es })}
              </span>
              <span className="text-sm font-bold tabular-nums">{format(date, 'd')}</span>
              <span className="flex h-1.5 gap-0.5">
                {d.charges.slice(0, 3).map((c, i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isSel ? 'currentColor' : dotColor(c.sub.name) }} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 min-h-[44px]">
        {selected.charges.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">
            {weekTotal === 0 ? 'Sin cobros esta semana' : `Nada el ${format(parseISO(selected.date), "EEEE d", { locale: es })}`}
          </p>
        ) : (
          <div className="space-y-2">
            {selected.charges.map(c => {
              const type = c.sub.type || 'expense';
              return (
                <div key={c.sub.id + c.date} className="flex items-center gap-3">
                  <ServiceLogo name={c.sub.name} size="sm" />
                  <span className="flex-1 min-w-0 text-sm font-medium text-foreground truncate">{c.sub.name}</span>
                  <span className={cn('text-sm font-bold tabular-nums shrink-0', type === 'income' ? 'text-secondary-600 dark:text-secondary-400' : 'text-foreground')}>
                    {type === 'income' ? '+' : ''}{formatCurrency(Number(c.sub.amount))}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
