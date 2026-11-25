'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, Info, PiggyBank, Shield, SlidersHorizontal, Target,
} from 'lucide-react';
import { useDashboard } from '@/lib/DashboardContext';
import { getCachedAverages, invalidateHomeData, setCachedAverages, useHomeData } from '@/lib/useHomeData';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { Skeleton } from '@/components/ui/skeleton';
import BudgetPlanEditor from '@/components/dashboard/budgets/BudgetPlanEditor';
import { getSpendingAnalysis } from '@/lib/actions/analysis';
import { computeBudgetMonth, type CategoryRow, type PlanAlert, type PlanBudget, type PlanSettings, type PlanTx } from '@/lib/budgetPlan';
import { savingsCategoryIds } from '@/lib/homeInsights';
import { cn, formatCurrency as fmt } from '@/lib/utils';

export default function BudgetsPageClient() {
  const { transactions, categories, userId } = useDashboard();
  // Presupuestos y plan salen de la caché compartida con Inicio: si vienes de allí, no se pide nada.
  const homeData = useHomeData(userId);
  const budgets: PlanBudget[] | null = homeData?.budgets ?? null;
  const settings: PlanSettings | null = homeData?.planSettings ?? null;
  const [averages, setAverages] = useState<Record<string, number>>(() => getCachedAverages(userId) ?? {});
  const [editorOpen, setEditorOpen] = useState(false);

  // Medias de gasto (12 meses): solo si no están en caché.
  useEffect(() => {
    if (getCachedAverages(userId)) return;
    let cancelled = false;
    getSpendingAnalysis().then(res => {
      if (cancelled || !res.data) return;
      const list = res.data.categories as ({ categoryId: string; average: number } | null)[];
      const data = Object.fromEntries(list.flatMap(c => (c ? [[String(c.categoryId), Number(c.average) || 0] as const] : [])));
      setCachedAverages(userId, data);
      setAverages(data);
    });
    return () => { cancelled = true; };
  }, [userId]);

  const savingsCats = useMemo(() => savingsCategoryIds(categories, budgets ?? []), [categories, budgets]);
  const usedCategoryIds = useMemo(
    () => new Set(transactions.filter(t => t.type === 'expense' && t.category_id).map(t => t.category_id!)),
    [transactions]
  );
  const month = useMemo(() => budgets && computeBudgetMonth({
    now: new Date(),
    transactions: transactions as unknown as PlanTx[],
    budgets,
    categories,
    settings,
    savingsCategories: savingsCats,
  }), [budgets, transactions, categories, settings, savingsCats]);

  const monthLabel = format(new Date(), 'MMMM yyyy', { locale: es });
  const hasPlan = !!month && (month.income > 0 || month.rows.length > 0);

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-8">
      <div className="sticky top-0 z-20 glass-nav border-b px-5 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors" aria-label="Volver">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Link>
          <div className="text-center min-w-0">
            <h1 className="text-base font-semibold text-foreground leading-tight">Presupuestos</h1>
            <p className="text-xs text-muted-foreground capitalize">{monthLabel}</p>
          </div>
          <button
            onClick={() => setEditorOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Configurar</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-6 space-y-5">
        {!month ? (
          <>
            <Skeleton className="h-64 rounded-3xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </>
        ) : !hasPlan ? (
          <Onboarding onStart={() => setEditorOpen(true)} />
        ) : (
          <div className="md:grid md:grid-cols-12 md:gap-5 space-y-5 md:space-y-0">
            <div className="md:col-span-5 space-y-5">
              <PlanHero month={month} />
              <div className="grid grid-cols-2 gap-3">
                <SavingsCard saved={month.saved} target={month.savingsTarget} />
                <CushionCard used={month.cushionUsed} total={month.cushion} />
              </div>
              {month.alerts.length > 0 && <AlertsList alerts={month.alerts} />}
            </div>

            <div className="md:col-span-7 space-y-3">
              <CategoriesHeader month={month} />
              {month.rows.length === 0 ? (
                <button
                  onClick={() => setEditorOpen(true)}
                  className="w-full rounded-2xl border border-dashed border-border p-8 text-center hover:bg-muted/40 transition-colors"
                >
                  <Target className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">Reparte tu dinero por categorías</p>
                  <p className="text-xs text-muted-foreground mt-1">Te sugerimos importes con tu gasto medio</p>
                </button>
              ) : (
                month.rows.map(r => <CategoryCard key={r.budgetId} row={r} monthProgress={month.monthProgress} />)
              )}
              {month.unbudgetedSpent > 0 && (
                <button
                  onClick={() => setEditorOpen(true)}
                  className="w-full flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                >
                  <span>
                    <span className="block text-sm font-medium text-foreground">Sin presupuesto</span>
                    <span className="block text-xs text-muted-foreground">Gastos en categorías fuera del plan</span>
                  </span>
                  <span className="text-sm font-bold tabular-nums text-foreground">{fmt(month.unbudgetedSpent)}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <BudgetPlanEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSaved={invalidateHomeData}
        categories={categories}
        budgets={budgets ?? []}
        settings={settings}
        averages={averages}
        savingsCategories={savingsCats}
        usedCategoryIds={usedCategoryIds}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

function Onboarding({ onStart }: { onStart: () => void }) {
  const steps = [
    { n: 1, title: 'Tu ingreso', text: 'Lo que entra cada mes.' },
    { n: 2, title: 'Ahorro y margen', text: 'Lo que quieres apartar y un colchón para imprevistos.' },
    { n: 3, title: 'Reparte el resto', text: 'Un límite por categoría, con tu gasto medio como guía.' },
  ];
  return (
    <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Target className="w-6 h-6 text-foreground" />
      </div>
      <h2 className="text-xl font-bold text-foreground">Planifica tu mes en un minuto</h2>
      <p className="text-sm text-muted-foreground mt-1">Sabrás en todo momento cuánto te queda y dónde te estás pasando.</p>
      <ol className="mt-6 space-y-4">
        {steps.map(s => (
          <li key={s.n} className="flex gap-3">
            <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">{s.n}</span>
            <span>
              <span className="block text-sm font-semibold text-foreground">{s.title}</span>
              <span className="block text-xs text-muted-foreground">{s.text}</span>
            </span>
          </li>
        ))}
      </ol>
      <button onClick={onStart} className="mt-6 w-full sm:w-auto px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
        Configurar mi mes
      </button>
    </div>
  );
}

function PlanHero({ month }: { month: NonNullable<ReturnType<typeof computeBudgetMonth>> }) {
  const { income, savingsTarget, cushion, spent, remaining, state, perDay, daysLeft, cushionUsed } = month;
  const label = state === 'ok' ? 'Te quedan para gastar' : state === 'margin' ? 'Tirando del margen' : 'Te has pasado del plan';
  const big = state === 'ok' ? remaining : state === 'margin' ? cushion - cushionUsed : -remaining - cushion;
  const lines = [
    { label: 'Ingreso', value: income, sign: '' },
    savingsTarget > 0 ? { label: 'Ahorro previsto', value: -savingsTarget, sign: '−', cls: 'text-secondary-400' } : null,
    cushion > 0 ? { label: 'Margen de seguridad', value: -cushion, sign: '−', cls: 'text-amber-400' } : null,
    { label: 'Gastado', value: -spent, sign: '−' },
  ].filter(Boolean) as { label: string; value: number; sign: string; cls?: string }[];

  return (
    <section className="relative overflow-hidden rounded-3xl bg-neutral-900 text-white p-5 sm:p-6 dark:ring-1 dark:ring-white/10">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] to-transparent pointer-events-none" />
      <div className="relative">
        <p className="text-sm text-white/60">{label}</p>
        <p className={cn(
          'text-[2.75rem] leading-none font-black tracking-tight tabular-nums mt-1',
          state === 'margin' && 'text-amber-400',
          state === 'over' && 'text-accent-400',
        )}>
          {fmt(big)}
        </p>
        <p className="text-sm text-white/60 mt-2">
          {state === 'ok'
            ? <>≈ <span className="text-white font-semibold tabular-nums">{fmt(perDay)}</span> al día · {daysLeft} {daysLeft === 1 ? 'día' : 'días'} restantes</>
            : state === 'margin'
              ? <>quedan en tu margen de {fmt(cushion)}</>
              : <>por encima de lo previsto, margen incluido</>}
        </p>

        {/* Desglose: ingreso − ahorro − margen − gastado = resultado */}
        <dl className="mt-5 space-y-1.5 text-sm">
          {lines.map(l => (
            <div key={l.label} className="flex justify-between gap-3">
              <dt className={cn('text-white/60', l.cls)}>{l.label}</dt>
              <dd className="tabular-nums text-white/90">{l.sign}{fmt(Math.abs(l.value))}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 pt-2 mt-1 border-t border-white/10 font-semibold">
            <dt>Resultado</dt>
            <dd className={cn('tabular-nums', remaining < 0 ? 'text-accent-400' : 'text-white')}>{fmt(remaining)}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function SavingsCard({ saved, target }: { saved: number; target: number }) {
  const pct = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <PiggyBank className="w-4 h-4 text-secondary-500" />
        <span className="text-xs font-medium">Ahorro</span>
      </div>
      <p className="mt-1 text-lg font-bold tabular-nums text-foreground">{fmt(saved)}</p>
      <p className="text-[11px] text-muted-foreground tabular-nums">{target > 0 ? `de ${fmt(target)} previsto` : 'Sin objetivo'}</p>
      {target > 0 && (
        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-secondary-500 transition-[width] duration-700" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

function CushionCard({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Shield className="w-4 h-4 text-amber-500" />
        <span className="text-xs font-medium">Margen</span>
      </div>
      <p className="mt-1 text-lg font-bold tabular-nums text-foreground">{fmt(Math.max(0, total - used))}</p>
      <p className="text-[11px] text-muted-foreground tabular-nums">{total > 0 ? (used > 0 ? `usados ${fmt(used)} de ${fmt(total)}` : 'intacto') : 'Sin margen'}</p>
      {total > 0 && (
        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className={cn('h-full rounded-full transition-[width] duration-700', pct >= 100 ? 'bg-accent-500' : 'bg-amber-400')} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

const ALERT_STYLE: Record<PlanAlert['tone'], { icon: typeof Info; cls: string }> = {
  danger: { icon: AlertTriangle, cls: 'bg-accent-500/10 text-accent-700 dark:text-accent-400' },
  warning: { icon: AlertTriangle, cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  info: { icon: Info, cls: 'bg-muted text-foreground' },
  good: { icon: CheckCircle2, cls: 'bg-secondary-500/10 text-secondary-700 dark:text-secondary-400' },
};

function AlertsList({ alerts }: { alerts: PlanAlert[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? alerts : alerts.slice(0, 3);
  return (
    <section className="space-y-2" aria-label="Avisos">
      <h2 className="text-sm font-semibold text-foreground px-1">Avisos</h2>
      {visible.map(a => {
        const { icon: Icon, cls } = ALERT_STYLE[a.tone];
        const body = (
          <>
            <Icon className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{a.title}</span>
              {a.body && <span className="block text-xs opacity-80 mt-0.5">{a.body}</span>}
            </span>
          </>
        );
        return a.categoryId ? (
          <a key={a.id} href={`#cat-${a.categoryId}`} className={cn('flex gap-2.5 rounded-xl p-3 hover:opacity-90', cls)}>{body}</a>
        ) : (
          <div key={a.id} className={cn('flex gap-2.5 rounded-xl p-3', cls)}>{body}</div>
        );
      })}
      {alerts.length > 3 && (
        <button onClick={() => setExpanded(v => !v)} className="text-xs font-semibold text-muted-foreground hover:text-foreground px-1">
          {expanded ? 'Ver menos' : `Ver ${alerts.length - 3} más`}
        </button>
      )}
    </section>
  );
}

function CategoriesHeader({ month }: { month: NonNullable<ReturnType<typeof computeBudgetMonth>> }) {
  const budgetedSpent = month.rows.reduce((a, r) => a + r.spent, 0);
  const pct = month.assigned > 0 ? Math.min(100, (budgetedSpent / month.assigned) * 100) : 0;
  return (
    <div className="px-1 pb-1">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Por categoría</h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          <span className="text-foreground font-semibold">{fmt(budgetedSpent)}</span> de {fmt(month.assigned)}
        </span>
      </div>
      {month.assigned > 0 && (
        <div className="relative mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-foreground/70 transition-[width] duration-700" style={{ width: `${pct}%` }} />
        </div>
      )}
      {month.income > 0 && month.unassigned !== 0 && (
        <p className={cn('mt-1.5 text-[11px] tabular-nums', month.unassigned < 0 ? 'text-accent-600 dark:text-accent-400' : 'text-muted-foreground')}>
          {month.unassigned < 0 ? `Repartido ${fmt(-month.unassigned)} de más` : `${fmt(month.unassigned)} sin repartir`}
        </p>
      )}
    </div>
  );
}

const STATUS_BAR: Record<CategoryRow['status'], string> = {
  ok: 'bg-secondary-500',
  warning: 'bg-amber-400',
  exceeded: 'bg-accent-500',
};

function CategoryCard({ row, monthProgress }: { row: CategoryRow; monthProgress: number }) {
  const [open, setOpen] = useState(false);
  const { category: c } = row;
  return (
    <div id={`cat-${c.id}`} className="scroll-mt-24 rounded-2xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: c.color ? `${c.color}1f` : 'var(--muted)' }}>
            <CategoryIcon name={c.icon} className="w-5 h-5" style={{ color: c.color || 'var(--muted-foreground)' }} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold text-foreground truncate">{c.name}</span>
            <span className="block text-xs text-muted-foreground tabular-nums">
              <span className="text-foreground font-medium">{fmt(row.spent)}</span> de {fmt(row.budget)}
            </span>
          </span>
          <span className="text-right shrink-0">
            <span className={cn('block text-sm font-bold tabular-nums', row.status === 'exceeded' ? 'text-accent-600 dark:text-accent-400' : 'text-foreground')}>
              {row.remaining >= 0 ? fmt(row.remaining) : `+${fmt(-row.remaining)}`}
            </span>
            <span className="block text-[11px] text-muted-foreground">
              {row.remaining >= 0 ? (row.perDay > 0 ? `${fmt(row.perDay)}/día` : 'quedan') : 'de más'}
            </span>
          </span>
        </div>

        {/* Barra con marcador de "dónde deberías ir" según el día del mes */}
        <div className="relative mt-3">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className={cn('h-full rounded-full transition-[width] duration-700', STATUS_BAR[row.status])} style={{ width: `${Math.min(100, row.pct)}%` }} />
          </div>
          <span
            className="absolute -top-1 h-4 w-0.5 rounded-full bg-foreground/40"
            style={{ left: `calc(${monthProgress * 100}% - 1px)` }}
            title="Lo que llevarías gastado a estas alturas si fueras al ritmo del presupuesto"
            aria-hidden
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="tabular-nums">{Math.round(row.pct)} %</span>
          <span className="flex items-center gap-1">
            {row.txs.length} {row.txs.length === 1 ? 'movimiento' : 'movimientos'}
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
          </span>
        </div>
      </button>

      {open && (
        <div className="border-t border-border divide-y divide-border max-h-64 overflow-y-auto">
          {row.txs.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">Sin movimientos este mes</p>
          ) : row.txs.map(t => (
            <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="min-w-0">
                <span className="block text-sm text-foreground truncate">{t.description?.trim() || c.name}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {format(parseISO(t.transaction_date), 'd MMM', { locale: es })}{t.type === 'transfer' ? ' · Transferencia' : ''}
                </span>
              </span>
              <span className="text-sm font-semibold tabular-nums text-foreground shrink-0">−{fmt(Number(t.amount))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
