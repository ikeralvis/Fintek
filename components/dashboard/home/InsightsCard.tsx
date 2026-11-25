'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { getDayOfYear } from 'date-fns';
import { ChevronRight, Flame, PieChart, Receipt, Repeat, Sparkles, TrendingDown, TrendingUp, PiggyBank } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Insight } from '@/lib/homeInsights';

/** Tiempo que se muestra cada insight antes de pasar al siguiente. */
const INTERVAL_MS = 6000;

const ICONS: Record<Insight['kind'], typeof Sparkles> = {
  pace: TrendingUp,
  up: TrendingUp,
  down: TrendingDown,
  streak: Flame,
  big: Receipt,
  share: PieChart,
  subs: Repeat,
  savings: PiggyBank,
};

const TONE: Record<Insight['tone'], string> = {
  good: 'bg-secondary-500/15 text-secondary-600 dark:text-secondary-400',
  bad: 'bg-accent-500/15 text-accent-600 dark:text-accent-400',
  neutral: 'bg-primary/10 text-foreground',
};

function useReducedMotion() {
  return useSyncExternalStore(
    cb => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => true,
  );
}

/**
 * Insights que pasan solos cada pocos segundos (empezando por uno distinto cada día).
 * El tiempo lo marca la animación CSS de la barra del punto activo: al terminar, pasa al
 * siguiente (onAnimationEnd), sin temporizadores. Con "reducir movimiento" no avanza solo.
 */
export default function InsightsCard({ insights }: { insights: Insight[] | null }) {
  const [step, setStep] = useState(0);
  const reducedMotion = useReducedMotion();
  const count = insights?.length ?? 0;
  const autoplay = count > 1 && !reducedMotion;

  if (!insights) return <div className="h-[104px] rounded-2xl bg-card border border-border animate-pulse" aria-busy="true" />;
  if (count === 0) return null;

  const index = (getDayOfYear(new Date()) + step) % count;
  const insight = insights[index];
  const Icon = insight.kind === 'pace' && insight.tone === 'good' ? TrendingDown : ICONS[insight.kind];

  const content = (
    <>
      <span className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', TONE[insight.tone])}>
        <Icon className="w-5 h-5" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-foreground">{insight.title}</span>
        <span className="block text-xs text-muted-foreground mt-0.5 leading-relaxed">{insight.body}</span>
      </span>
      {insight.href && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 self-center" />}
    </>
  );

  return (
    <section className="bg-card rounded-2xl border border-border p-4" aria-roledescription="carrusel">
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Sparkles className="w-4 h-4 text-amber-500" /> Para ti hoy
        </h2>
        {count > 1 && (
          <div className="flex items-center gap-1" role="tablist" aria-label="Insights">
            {insights.map((item, i) => {
              const active = i === index;
              return (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={active}
                  aria-label={`Insight ${i + 1} de ${count}`}
                  onClick={() => setStep(s => s + ((i - index + count) % count))}
                  className="p-1"
                >
                  <span className={cn('relative block h-1.5 rounded-full overflow-hidden transition-all', active ? 'w-5 bg-border' : 'w-1.5 bg-border')}>
                    {active && (
                      <span
                        key={step}
                        className="absolute inset-0 origin-left bg-foreground rounded-full"
                        style={autoplay ? { animation: `insight-progress ${INTERVAL_MS}ms linear forwards` } : undefined}
                        onAnimationEnd={() => setStep(s => s + 1)}
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div key={insight.id} className="animate-in fade-in-0 slide-in-from-right-2 duration-300" aria-live="polite">
        {insight.href ? (
          <Link href={insight.href} className="flex items-start gap-3 -m-2 p-2 rounded-xl hover:bg-muted/60 transition-colors">
            {content}
          </Link>
        ) : (
          <div className="flex items-start gap-3">{content}</div>
        )}
      </div>
    </section>
  );
}
