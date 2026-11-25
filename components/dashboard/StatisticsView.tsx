'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { addMonths, addYears, format, getYear, isAfter, startOfMonth, startOfYear, subMonths, subYears } from 'date-fns';
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Coffee, Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Bar, BarChart, Line, LineChart, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { computePeriodStats, periodCsv, type CategoryRow, type PeriodType, type StatCategory, type StatTx } from '@/lib/statistics';
import { useYearTransactions } from '@/lib/useYearTransactions';
import InternalMovesCard from '@/components/dashboard/stats/InternalMovesCard';
import { cn, formatCurrency as fmt } from '@/lib/utils';

type Account = { id: string; name: string; current_balance: number; banks?: { name?: string; color?: string; logo_url?: string | null } | null };

const GREEN = '#10b981';
const RED = '#f43f5e';

const pct = (r: number) => `${r >= 0 ? '+' : ''}${Math.round(r * 100)} %`;

export default function StatisticsView({ transactions, accounts, categories, userId }: {
  transactions: StatTx[];
  accounts: Account[];
  categories: StatCategory[];
  userId: string;
}) {
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [date, setDate] = useState(() => new Date());
  const [exporting, setExporting] = useState(false);

  // Años que hacen falta: el del periodo y el del periodo anterior (comparativa).
  const year = getYear(date);
  const prevYear = getYear(periodType === 'month' ? subMonths(date, 1) : subYears(date, 1));
  const years = useMemo(() => [year, prevYear], [year, prevYear]);
  const extra = useYearTransactions(userId, years);
  const all = useMemo(() => [...extra.transactions, ...transactions], [extra.transactions, transactions]);

  const stats = useMemo(() => computePeriodStats(all, categories, periodType, date), [all, categories, periodType, date]);
  // La revisión de traspasos solo mira el año que estás viendo (sin pedir nada más).
  const yearTxs = useMemo(() => all.filter(t => t.transaction_date.startsWith(String(year))), [all, year]);

  const next = periodType === 'month' ? addMonths(date, 1) : addYears(date, 1);
  const canGoNext = !isAfter(periodType === 'month' ? startOfMonth(next) : startOfYear(next), new Date());
  const move = (dir: -1 | 1) => setDate(d => (periodType === 'month' ? addMonths(d, dir) : addYears(d, dir)));

  const exportPdf = async () => {
    setExporting(true);
    try {
      const { downloadStatisticsPdf } = await import('@/lib/statisticsPdf');
      await downloadStatisticsPdf(stats, accounts, periodType);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo generar el PDF');
    } finally {
      setExporting(false);
    }
  };

  const exportCsv = () => {
    const csv = periodCsv(all, categories, stats.start, stats.end);
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }); // BOM: tildes bien en Excel
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Fintek_Movimientos_${periodType === 'month' ? stats.start.slice(0, 7) : stats.start.slice(0, 4)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const title = stats.label.charAt(0).toUpperCase() + stats.label.slice(1);

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-8">
      <div className="sticky top-0 z-20 glass-nav border-b px-5 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors" aria-label="Volver">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="text-base font-semibold text-foreground">Estadísticas</h1>
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={exporting || stats.txCount === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 outline-none"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span className="hidden sm:inline">Exportar</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuItem onSelect={exportPdf} className="flex items-center gap-2 cursor-pointer">
                <FileText className="w-4 h-4 text-muted-foreground" /> Informe PDF
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={exportCsv} className="flex items-center gap-2 cursor-pointer">
                <FileSpreadsheet className="w-4 h-4 text-muted-foreground" /> Movimientos (CSV)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-6 space-y-5">
        {/* Periodo */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-0.5 p-0.5 bg-muted rounded-lg">
            {([['month', 'Mes'], ['year', 'Año']] as const).map(([k, l]) => (
              <button
                key={k}
                onClick={() => { setPeriodType(k); setDate(new Date()); }}
                className={cn('px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all', periodType === k ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => move(-1)} className="p-2 rounded-lg hover:bg-muted" aria-label="Periodo anterior"><ChevronLeft className="w-4 h-4" /></button>
            <span className="min-w-28 text-center text-sm font-semibold capitalize text-foreground flex items-center justify-center gap-1.5">
              {stats.label}
              {extra.loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            </span>
            <button onClick={() => move(1)} disabled={!canGoNext} className="p-2 rounded-lg hover:bg-muted disabled:opacity-30" aria-label="Periodo siguiente"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>

        {stats.txCount === 0 && !extra.loading ? (
          <div className="rounded-3xl border border-dashed border-border p-12 text-center">
            <p className="text-sm font-medium text-foreground">Sin movimientos en {stats.label}</p>
            <p className="text-xs text-muted-foreground mt-1">Cambia de periodo con las flechas.</p>
          </div>
        ) : (
          <div className="md:grid md:grid-cols-12 md:gap-5 space-y-5 md:space-y-0">
            <div className="md:col-span-7 space-y-5">
              <Hero stats={stats} title={title} />
              <InternalMovesCard transactions={yearTxs} accounts={accounts} year={year} />
              <EvolutionCard stats={stats} periodType={periodType} />
              <CategoriesCard stats={stats} />
            </div>
            <div className="md:col-span-5 space-y-5">
              <MerchantsCard stats={stats} />
              <WeekdayCard stats={stats} />
              {stats.micro.count > 0 && (
                <section className="rounded-2xl border border-border bg-card p-4 flex gap-3">
                  <span className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Coffee className="w-5 h-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-foreground">Gasto hormiga: {fmt(stats.micro.total)}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {stats.micro.count} compras de menos de 10 €, el {Math.round(stats.micro.share * 100)} % de lo que gastaste.
                    </span>
                  </span>
                </section>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

function ChangeBadge({ change, inverse, prevLabel }: { change: number | null; inverse?: boolean; prevLabel: string }) {
  if (change === null) return <span className="text-[11px] text-white/40">sin datos de {prevLabel}</span>;
  const good = inverse ? change <= 0 : change >= 0;
  return (
    <span className={cn('text-[11px] font-semibold tabular-nums', good ? 'text-secondary-400' : 'text-accent-400')}>
      {pct(change)} <span className="font-normal text-white/50">vs {prevLabel}</span>
    </span>
  );
}

function Hero({ stats, title }: { stats: ReturnType<typeof computePeriodStats>; title: string }) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-neutral-900 text-white p-5 sm:p-6 dark:ring-1 dark:ring-white/10">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] to-transparent pointer-events-none" />
      <div className="relative">
        <p className="text-sm text-white/60">Balance · {title}</p>
        <p className={cn('text-[2.75rem] leading-none font-black tracking-tight tabular-nums mt-1', stats.balance < 0 && 'text-accent-400')}>
          {stats.balance >= 0 ? '+' : ''}{fmt(stats.balance)}
        </p>
        {stats.income > 0 && (
          <p className="text-sm text-white/60 mt-2">
            Has ahorrado el <span className="text-white font-semibold">{Math.round(stats.savingsRate * 100)} %</span> de lo que entró
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div>
            <p className="text-xs text-white/50">Ingresos</p>
            <p className="text-lg font-bold tabular-nums text-secondary-400">+{fmt(stats.income)}</p>
            <ChangeBadge change={stats.incomeChange} prevLabel={stats.prevLabel} />
          </div>
          <div className="text-right">
            <p className="text-xs text-white/50">Gastos</p>
            <p className="text-lg font-bold tabular-nums">−{fmt(stats.expense)}</p>
            <ChangeBadge change={stats.expenseChange} inverse prevLabel={stats.prevLabel} />
          </div>
        </div>
      </div>
    </section>
  );
}

function EvolutionCard({ stats, periodType }: { stats: ReturnType<typeof computePeriodStats>; periodType: PeriodType }) {
  if (periodType === 'month') {
    const config: ChartConfig = { cumExpense: { label: 'Este mes', color: RED }, prevCumExpense: { label: stats.prevLabel, color: '#a1a1aa' } };
    const today = format(new Date(), 'yyyy-MM-dd');
    // El mes en curso solo se dibuja hasta hoy.
    const data = stats.series.map((d, i) => ({
      ...d,
      cumExpense: `${stats.start.slice(0, 8)}${String(i + 1).padStart(2, '0')}` <= today ? d.cumExpense : null,
    }));
    return (
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-foreground">Gasto acumulado</h2>
        <p className="text-xs text-muted-foreground">Cómo vas frente a {stats.prevLabel}</p>
        <ChartContainer config={config} className="h-[200px] mt-3">
          <LineChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} interval={4} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} width={48} tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v)))} />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={l => `Día ${l}`} formatter={v => fmt(v)} />} />
            <Line type="monotone" dataKey="prevCumExpense" stroke="#a1a1aa" strokeWidth={1.5} strokeDasharray="4 4" dot={false} animationDuration={400} />
            <Line type="monotone" dataKey="cumExpense" stroke={RED} strokeWidth={2.5} dot={false} connectNulls={false} animationDuration={400} />
          </LineChart>
        </ChartContainer>
      </section>
    );
  }
  const config: ChartConfig = { income: { label: 'Ingresos', color: GREEN }, expense: { label: 'Gastos', color: RED } };
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-foreground">Mes a mes</h2>
      <ChartContainer config={config} className="h-[200px] mt-3">
        <BarChart data={stats.series} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} width={48} tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v)))} />
          <ChartTooltip cursor={{ fill: 'var(--muted)', opacity: 0.5 }} content={<ChartTooltipContent formatter={v => fmt(v)} />} />
          <Bar dataKey="income" fill={GREEN} radius={[3, 3, 0, 0]} maxBarSize={16} />
          <Bar dataKey="expense" fill={RED} radius={[3, 3, 0, 0]} maxBarSize={16} />
        </BarChart>
      </ChartContainer>
    </section>
  );
}

function CategoriesCard({ stats }: { stats: ReturnType<typeof computePeriodStats> }) {
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [open, setOpen] = useState<string | null>(null);
  const rows = kind === 'expense' ? stats.expenseCategories : stats.incomeCategories;
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Por categoría</h2>
        <div className="flex gap-0.5 p-0.5 bg-muted rounded-lg">
          {([['expense', 'Gastos'], ['income', 'Ingresos']] as const).map(([k, l]) => (
            <button key={k} onClick={() => { setKind(k); setOpen(null); }} className={cn('px-3 py-1 rounded-md text-[11px] font-semibold', kind === k ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}>{l}</button>
          ))}
        </div>
      </div>
      {/* Reparto en una sola barra */}
      {rows.length > 0 && (
        <div className="mt-3 flex h-2 gap-0.5 rounded-full overflow-hidden">
          {rows.map(r => <div key={r.id} style={{ flexGrow: Math.max(r.share, 0.002), backgroundColor: r.color }} title={`${r.name}: ${Math.round(r.share * 100)} %`} />)}
        </div>
      )}
      <div className="mt-3 divide-y divide-border">
        {rows.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Nada en este periodo</p>}
        {rows.map(r => (
          <CategoryLine key={r.id} row={r} inverse={kind === 'expense'} open={open === r.id} onToggle={() => setOpen(o => (o === r.id ? null : r.id))} prevLabel={stats.prevLabel} />
        ))}
      </div>
    </section>
  );
}

function CategoryLine({ row, inverse, open, onToggle, prevLabel }: { row: CategoryRow; inverse: boolean; open: boolean; onToggle: () => void; prevLabel: string }) {
  const good = row.change === null ? null : inverse ? row.change <= 0 : row.change >= 0;
  return (
    <div className="py-2.5">
      <button onClick={onToggle} aria-expanded={open} className="w-full flex items-center gap-3 text-left">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${row.color}1f` }}>
          <CategoryIcon name={row.icon} className="w-4.5 h-4.5" style={{ color: row.color }} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-foreground truncate">{row.name}</span>
            <span className="text-sm font-bold tabular-nums text-foreground shrink-0">{fmt(row.amount)}</span>
          </span>
          <span className="mt-1 flex items-center gap-2">
            <span className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <span className="block h-full rounded-full" style={{ width: `${row.share * 100}%`, backgroundColor: row.color }} />
            </span>
            <span className="text-[11px] text-muted-foreground tabular-nums w-9 text-right">{Math.round(row.share * 100)} %</span>
            <span
              className={cn('text-[11px] font-semibold tabular-nums w-14 text-right', good === null ? 'text-muted-foreground' : good ? 'text-secondary-600 dark:text-secondary-400' : 'text-accent-600 dark:text-accent-400')}
              title={`Frente a ${prevLabel}: ${fmt(row.prevAmount)}`}
            >
              {row.change === null ? 'nuevo' : pct(row.change)}
            </span>
          </span>
        </span>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-2 ml-12 space-y-1.5">
          <p className="text-[11px] text-muted-foreground">{row.count} {row.count === 1 ? 'movimiento' : 'movimientos'} · en {prevLabel}: {fmt(row.prevAmount)}</p>
          {row.topMerchants.map(m => (
            <div key={m.name} className="flex justify-between gap-3 text-xs">
              <span className="text-foreground truncate">{m.name} <span className="text-muted-foreground">×{m.count}</span></span>
              <span className="tabular-nums font-medium text-foreground shrink-0">{fmt(m.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MerchantsCard({ stats }: { stats: ReturnType<typeof computePeriodStats> }) {
  if (stats.topMerchants.length === 0) return null;
  const max = stats.topMerchants[0].amount;
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-foreground">Dónde más gastas</h2>
      <div className="mt-3 space-y-2.5">
        {stats.topMerchants.map((m, i) => (
          <div key={m.name}>
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-foreground truncate"><span className="text-muted-foreground tabular-nums mr-1.5">{i + 1}</span>{m.name}</span>
              <span className="font-semibold tabular-nums text-foreground shrink-0">{fmt(m.amount)}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                <span className="block h-full rounded-full bg-foreground/60" style={{ width: `${(m.amount / max) * 100}%` }} />
              </span>
              <span className="text-[11px] text-muted-foreground tabular-nums">{m.count} {m.count === 1 ? 'vez' : 'veces'}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function WeekdayCard({ stats }: { stats: ReturnType<typeof computePeriodStats> }) {
  const max = Math.max(...stats.weekdays.map(d => d.avg));
  if (max <= 0) return null;
  const top = stats.weekdays.find(d => d.avg === max)!;
  const names: Record<string, string> = { L: 'los lunes', M: 'los martes', X: 'los miércoles', J: 'los jueves', V: 'los viernes', S: 'los sábados', D: 'los domingos' };
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-foreground">Por día de la semana</h2>
      <p className="text-xs text-muted-foreground">Gastas más {names[top.label]}: {fmt(top.avg)} de media</p>
      <div className="mt-4 grid grid-cols-7 gap-1.5 items-end h-24">
        {stats.weekdays.map(d => (
          <div key={d.label} className="flex flex-col items-center gap-1 h-full justify-end">
            <div
              className={cn('w-full rounded-md transition-[height] duration-500', d.avg === max ? 'bg-accent-500' : 'bg-muted-foreground/25')}
              style={{ height: `${Math.max(4, (d.avg / max) * 100)}%` }}
              title={`${fmt(d.avg)} de media`}
            />
            <span className="text-[10px] text-muted-foreground">{d.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
