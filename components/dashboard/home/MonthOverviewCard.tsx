'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import type { MonthOverview } from '@/lib/homeInsights';
import type { BudgetMonth } from '@/lib/budgetPlan';

type Props = {
  overview: MonthOverview | null;
  /** Plan de Presupuestos: si existe, el bloque del mes usa su mismo cálculo. */
  plan: BudgetMonth | null;
  totalBalance: number;
};

/**
 * Tarjeta principal de Inicio. Lo primero, en grande, es tu dinero (saldo total). Debajo, el
 * mes: con plan de Presupuestos, cuánto te queda según el plan (y lleva allí); sin plan, lo
 * que ha entrado y salido este mes y una invitación a configurarlo.
 */
export default function MonthOverviewCard({ overview, plan, totalBalance }: Props) {
  const monthName = format(new Date(), 'MMMM', { locale: es });

  return (
    <section className="relative overflow-hidden rounded-3xl bg-neutral-900 text-white p-5 sm:p-6 dark:ring-1 dark:ring-white/10">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] to-transparent pointer-events-none" />
      <div className="relative">
        <Link href="/dashboard/cuentas" className="group inline-block -m-1 p-1 rounded-xl">
          <span className="flex items-center gap-1 text-sm text-white/60">
            Saldo total <ChevronRight className="w-3.5 h-3.5 opacity-60 transition-transform group-hover:translate-x-0.5" />
          </span>
          <span className="block text-[2.75rem] leading-none font-black tracking-tight tabular-nums mt-1">
            {formatCurrency(totalBalance)}
          </span>
        </Link>

        <div className="mt-5">
          {!overview ? (
            <div className="h-[132px] rounded-2xl bg-white/[0.06] animate-pulse" aria-busy="true" aria-label="Cargando resumen del mes" />
          ) : plan && plan.income > 0 ? (
            <PlanBlock plan={plan} pendingFixed={overview.pendingFixed} monthName={monthName} />
          ) : (
            <MonthBlock overview={overview} monthName={monthName} />
          )}
        </div>
      </div>
    </section>
  );
}

/** Con plan: misma cuenta que la cabecera de Presupuestos (ingreso − ahorro − margen − gastado). */
function PlanBlock({ plan, pendingFixed, monthName }: { plan: BudgetMonth; pendingFixed: number; monthName: string }) {
  const { income, savingsTarget, cushion, spent, remaining, state, perDay, daysLeft, cushionUsed } = plan;
  const label = state === 'ok' ? `Te quedan para ${monthName}` : state === 'margin' ? 'Tirando del margen' : 'Te has pasado del plan';
  const big = state === 'ok' ? remaining : state === 'margin' ? cushion - cushionUsed : -remaining - cushion;
  const toSpend = Math.max(0, income - savingsTarget - cushion);
  const spentPct = toSpend > 0 ? Math.min(100, (spent / toSpend) * 100) : 100;

  return (
    <Link href="/dashboard/presupuestos" className="block rounded-2xl bg-white/[0.06] hover:bg-white/[0.09] transition-colors p-4" aria-label="Ver presupuestos">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-white/60">{label}</p>
        <ChevronRight className="w-4 h-4 text-white/40" />
      </div>
      <p className={cn(
        'text-2xl font-bold tracking-tight tabular-nums mt-0.5',
        state === 'margin' && 'text-amber-400',
        state === 'over' && 'text-accent-400',
      )}>
        {formatCurrency(big)}
      </p>
      <p className="text-xs text-white/60 mt-0.5">
        {state === 'ok'
          ? <>≈ <span className="text-white font-semibold tabular-nums">{formatCurrency(perDay)}</span> al día · {daysLeft} {daysLeft === 1 ? 'día' : 'días'} restantes</>
          : state === 'margin'
            ? <>quedan en tu margen de {formatCurrency(cushion)}</>
            : <>por encima de lo previsto, margen incluido</>}
      </p>

      <div className="h-1.5 mt-3 rounded-full overflow-hidden bg-white/10" role="img" aria-label={`Gastado el ${Math.round(spentPct)} % de lo previsto para gastar`}>
        <div
          className={cn('h-full rounded-full', state === 'ok' ? 'bg-white' : state === 'margin' ? 'bg-amber-400' : 'bg-accent-400')}
          style={{ width: `${spentPct}%` }}
        />
      </div>
      <div className="flex justify-between gap-3 mt-2 text-xs text-white/50 tabular-nums">
        <span>
          Gastado <span className="text-white font-semibold">{formatCurrency(spent)}</span>
          {pendingFixed > 0 && <> · +{formatCurrency(pendingFixed)} pendientes</>}
        </span>
        <span>de <span className="text-white font-semibold">{formatCurrency(toSpend)}</span></span>
      </div>
    </Link>
  );
}

/** Sin plan: entradas y salidas del mes, y acceso a configurar el plan. */
function MonthBlock({ overview, monthName }: { overview: MonthOverview; monthName: string }) {
  const { spent, saved, pendingFixed, expectedIncome, incomeSource } = overview;
  // Solo lo que ha entrado de verdad (no medias ni previsiones: sin plan no hay previsión).
  const received = incomeSource === 'received' ? expectedIncome : 0;
  const net = received - spent;

  return (
    <div className="rounded-2xl bg-white/[0.06] p-4">
      <p className="text-sm text-white/60 capitalize">{monthName}</p>
      <div className="grid grid-cols-2 gap-3 mt-2">
        <div>
          <p className="text-xs text-white/50">Ha entrado</p>
          <p className="text-lg font-bold tabular-nums text-secondary-400">+{formatCurrency(received)}</p>
          {saved > 0 && <p className="text-[11px] text-white/50 tabular-nums">{formatCurrency(saved)} ahorrados</p>}
        </div>
        <div className="text-right">
          <p className="text-xs text-white/50">Has gastado</p>
          <p className="text-lg font-bold tabular-nums">−{formatCurrency(spent)}</p>
          {pendingFixed > 0 && <p className="text-[11px] text-white/50 tabular-nums">+{formatCurrency(pendingFixed)} pendientes</p>}
        </div>
      </div>
      {received > 0 && (
        <p className={cn('text-xs mt-2 tabular-nums', net >= 0 ? 'text-white/60' : 'text-accent-400')}>
          {net >= 0 ? `Balance del mes: +${formatCurrency(net)}` : `Has gastado ${formatCurrency(-net)} más de lo que ha entrado`}
        </p>
      )}
      <Link
        href="/dashboard/presupuestos"
        className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-white/10 hover:bg-white/15 transition-colors px-3 py-2.5 text-sm"
      >
        <span>Configura tu mes y sabrás cuánto te queda</span>
        <ArrowRight className="w-4 h-4 shrink-0" />
      </Link>
    </div>
  );
}
