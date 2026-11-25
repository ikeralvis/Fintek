'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  addMonths, eachDayOfInterval, endOfMonth, format, getDay, parseISO, startOfMonth, subDays, subMonths, subYears,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Pencil, Plus, Trash2, TrendingUp } from 'lucide-react';
import { Area, Bar, BarChart, Cell, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { NumericInput } from '@/components/ui/numeric-input';
import { BankLogo } from '@/components/ui/account-picker-sheet';
import DailyValuesDialog from '@/components/dashboard/investments/DailyValuesDialog';
import ReviewContributions, { useUndatedTotal } from '@/components/dashboard/investments/ReviewContributions';
import { AlertTriangle } from 'lucide-react';
import { setContributionInvested } from '@/lib/actions/investments';
import {
  buildSeries, contributedTotal, monthlyReturns, periodStats,
  type InvAccount, type InvContribution, type InvSnapshot,
} from '@/lib/investments';
import { cn, formatCurrency as fmt } from '@/lib/utils';

type Props = {
  accounts: InvAccount[];
  snapshots: InvSnapshot[];
  contributions: InvContribution[];
  userId: string;
};

type Period = '1S' | '1M' | '3M' | '1A' | 'Todo';
type Tab = 'resumen' | 'calendario' | 'registros';

const PERIODS: Period[] = ['1S', '1M', '3M', '1A', 'Todo'];
const ACCOUNT_COLORS = ['#3f3f46', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#f43f5e', '#84cc16'];
const GAIN = '#10b981';
const LOSS = '#f43f5e';

const pctFmt = (r: number, digits = 2) => `${r >= 0 ? '+' : ''}${(r * 100).toFixed(digits).replace('.', ',')} %`;
const signed = (n: number) => `${n >= 0 ? '+' : ''}${fmt(n)}`;
const tone = (n: number) => (n >= 0 ? 'text-secondary-600 dark:text-secondary-400' : 'text-accent-600 dark:text-accent-400');

function periodStart(p: Period): string | null {
  const now = new Date();
  const d = p === '1S' ? subDays(now, 7) : p === '1M' ? subMonths(now, 1) : p === '3M' ? subMonths(now, 3) : p === '1A' ? subYears(now, 1) : null;
  return d ? format(d, 'yyyy-MM-dd') : null;
}

export default function InvestmentsView({ accounts, snapshots, contributions, userId }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('resumen');
  const [period, setPeriod] = useState<Period>('1M');
  const [valuesOpen, setValuesOpen] = useState(false);

  const { series, daily } = useMemo(() => buildSeries(accounts, snapshots, contributions), [accounts, snapshots, contributions]);
  const latest = series[series.length - 1];
  const totalValue = latest?.total ?? accounts.reduce((a, acc) => a + Number(acc.current_balance), 0);
  const totalContributed = accounts.reduce((a, acc) => a + contributedTotal(acc, contributions), 0);
  const totalGain = totalValue - totalContributed;
  const totalGainPct = totalContributed > 0 ? totalGain / totalContributed : 0;
  const pending = contributions.filter(c => c.status === 'pending' && Number(c.amount) > 0);
  const pendingTotal = pending.reduce((a, c) => a + Number(c.amount), 0);
  const lastDay = daily[daily.length - 1];
  const undatedTotal = useUndatedTotal(accounts, snapshots, contributions);

  if (accounts.length === 0) return <EmptyState />;

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-8">
      <div className="sticky top-0 z-20 glass-nav border-b px-5 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors" aria-label="Volver">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="text-base font-semibold text-foreground">Inversiones</h1>
          <button
            onClick={() => setValuesOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Valores
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-6 space-y-5">
        {/* Resumen de la cartera */}
        <section className="relative overflow-hidden rounded-3xl bg-neutral-900 text-white p-5 sm:p-6 dark:ring-1 dark:ring-white/10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] to-transparent pointer-events-none" />
          <div className="relative">
            <p className="text-sm text-white/60">Valor de tu cartera</p>
            <p className="text-[2.75rem] leading-none font-black tracking-tight tabular-nums mt-1">{fmt(totalValue)}</p>
            <p className={cn('mt-2 text-sm font-semibold tabular-nums', totalGain >= 0 ? 'text-secondary-400' : 'text-accent-400')}>
              {signed(totalGain)} ({pctFmt(totalGainPct)}) <span className="text-white/50 font-normal">desde el inicio</span>
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-white/50">Aportado</p>
                <p className="font-bold tabular-nums">{fmt(totalContributed)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/50">{lastDay ? `Último día (${dayLabel(lastDay.date)})` : 'Último día'}</p>
                <p className={cn('font-bold tabular-nums', lastDay ? (lastDay.gain >= 0 ? 'text-secondary-400' : 'text-accent-400') : 'text-white/50')}>
                  {lastDay ? <>{signed(lastDay.gain)} <span className="text-xs font-semibold">({pctFmt(lastDay.ret)})</span></> : '—'}
                </p>
              </div>
            </div>
            {pendingTotal > 0 && (
              <p className="mt-4 flex items-center gap-1.5 rounded-xl bg-amber-400/15 px-3 py-2 text-xs text-amber-300">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                {fmt(pendingTotal)} aportados pendientes de invertir (incluidos en el valor)
              </p>
            )}
          </div>
        </section>

        <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit" role="tablist">
          {([['resumen', 'Resumen'], ['calendario', 'Calendario'], ['registros', 'Registros']] as const).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn('px-4 py-1.5 rounded-lg text-xs font-semibold transition-all', tab === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'resumen' && undatedTotal > 1 && (
          <button
            onClick={() => setTab('registros')}
            className="w-full flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-left hover:bg-amber-500/15 transition-colors"
          >
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              <span className="block text-sm font-semibold text-foreground">Hay {fmt(undatedTotal)} aportados sin fecha</span>
              <span className="block text-xs text-muted-foreground">Cuentan como ganancia en los gráficos y la rentabilidad. Toca para revisarlos.</span>
            </span>
          </button>
        )}
        {tab === 'resumen' && (
          <SummaryTab
            accounts={accounts}
            contributions={contributions}
            series={series}
            daily={daily}
            period={period}
            setPeriod={setPeriod}
            totalValue={totalValue}
            pending={pending}
            onChanged={() => router.refresh()}
          />
        )}
        {tab === 'calendario' && <CalendarTab daily={daily} />}
        {tab === 'registros' && (
          <RecordsTab accounts={accounts} snapshots={snapshots} contributions={contributions} userId={userId} onChanged={() => router.refresh()} />
        )}
      </div>

      <DailyValuesDialog
        open={valuesOpen}
        onClose={() => setValuesOpen(false)}
        onSaved={() => router.refresh()}
        accounts={accounts}
        snapshots={snapshots}
        contributions={contributions}
      />
    </div>
  );
}

function dayLabel(date: string) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  return date === today ? 'hoy' : date === yesterday ? 'ayer' : format(parseISO(date), 'd MMM', { locale: es });
}

function EmptyState() {
  return (
    <div className="min-h-screen bg-background pb-32 md:pb-8">
      <div className="sticky top-0 z-20 glass-nav border-b px-5 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-muted" aria-label="Volver"><ArrowLeft className="w-5 h-5 text-foreground" /></Link>
          <h1 className="text-lg font-semibold text-foreground">Inversiones</h1>
          <div className="w-9" />
        </div>
      </div>
      <div className="flex flex-col items-center justify-center px-5 pt-20 text-center">
        <TrendingUp className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Sin cuentas de inversión</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">Crea una cuenta de tipo inversión para seguir su valor y tu rentabilidad real.</p>
        <Link href="/dashboard/cuentas" className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold">Ir a Cuentas</Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Resumen
// ---------------------------------------------------------------------------------------------

function SummaryTab({ accounts, contributions, series, daily, period, setPeriod, totalValue, pending, onChanged }: {
  accounts: InvAccount[];
  contributions: InvContribution[];
  series: ReturnType<typeof buildSeries>['series'];
  daily: ReturnType<typeof buildSeries>['daily'];
  period: Period;
  setPeriod: (p: Period) => void;
  totalValue: number;
  pending: InvContribution[];
  onChanged: () => void;
}) {
  const from = periodStart(period);
  const stats = useMemo(() => periodStats(daily, from), [daily, from]);
  const chartSeries = useMemo(() => {
    const list = series.filter(p => !from || p.date >= from);
    return list.map(p => ({ label: format(parseISO(p.date), 'd MMM', { locale: es }), value: Math.round(p.total * 100) / 100, contributed: Math.round(p.contributed * 100) / 100 }));
  }, [series, from]);
  const dailyBars = useMemo(
    () => daily.filter(d => !from || d.date > from).map(d => ({ label: format(parseISO(d.date), 'd MMM', { locale: es }), gain: Math.round(d.gain * 100) / 100, flows: d.flows })),
    [daily, from]
  );
  const months = useMemo(() => monthlyReturns(daily).slice(-12).reverse(), [daily]);
  const maxMonthAbs = Math.max(1, ...months.map(m => Math.abs(m.gain)));

  const valueConfig: ChartConfig = { value: { label: 'Valor', color: '#10b981' }, contributed: { label: 'Aportado', color: '#a1a1aa' } };
  const gainConfig: ChartConfig = { gain: { label: 'Ganancia' } };

  return (
    <div className="md:grid md:grid-cols-12 md:gap-5 space-y-5 md:space-y-0">
      <div className="md:col-span-7 space-y-5">
        {/* Periodo */}
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">Rendimiento</h2>
            <div className="flex gap-0.5 p-0.5 bg-muted rounded-lg">
              {PERIODS.map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn('px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all', period === p ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className={cn('text-3xl font-black tabular-nums tracking-tight', tone(stats.gain))}>{signed(stats.gain)}</p>
              <p className={cn('text-sm font-semibold tabular-nums', tone(stats.twr))}>{pctFmt(stats.twr)} <span className="text-muted-foreground font-normal">rentabilidad</span></p>
            </div>
            {stats.days > 0 && (
              <p className="text-right text-[11px] text-muted-foreground tabular-nums">
                {stats.positiveDays} de {stats.days} días en positivo
              </p>
            )}
          </div>
          {(stats.best || stats.worst) && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {stats.best && (
                <div className="rounded-xl bg-muted/60 px-3 py-2">
                  <p className="text-muted-foreground">Mejor día · {dayLabel(stats.best.date)}</p>
                  <p className={cn('font-bold tabular-nums', tone(stats.best.gain))}>{signed(stats.best.gain)}</p>
                </div>
              )}
              {stats.worst && (
                <div className="rounded-xl bg-muted/60 px-3 py-2">
                  <p className="text-muted-foreground">Peor día · {dayLabel(stats.worst.date)}</p>
                  <p className={cn('font-bold tabular-nums', tone(stats.worst.gain))}>{signed(stats.worst.gain)}</p>
                </div>
              )}
            </div>
          )}

          {chartSeries.length > 1 && (
            <>
              <p className="mt-5 mb-1 text-xs text-muted-foreground">Valor frente a lo aportado: la distancia entre las líneas es tu ganancia.</p>
              <ChartContainer config={valueConfig} className="h-[200px]">
                <ComposedChart data={chartSeries} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="invValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} minTickGap={24} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} width={56}
                    domain={[(min: number) => Math.floor(min * 0.995), (max: number) => Math.ceil(max * 1.005)]}
                    tickFormatter={(v: number) => `${Math.round(v / 1000 * 10) / 10}k`} />
                  <ChartTooltip content={<ChartTooltipContent formatter={v => fmt(v)} />} />
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fill="url(#invValue)" animationDuration={500} />
                  <Line type="stepAfter" dataKey="contributed" stroke="#a1a1aa" strokeWidth={1.5} strokeDasharray="4 4" dot={false} animationDuration={500} />
                </ComposedChart>
              </ChartContainer>
            </>
          )}

          {dailyBars.length > 0 && (
            <>
              <p className="mt-5 mb-1 text-xs text-muted-foreground">Ganancia de cada día (sin contar aportaciones)</p>
              <ChartContainer config={gainConfig} className="h-[140px]">
                <BarChart data={dailyBars} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} minTickGap={24} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} width={56} />
                  <ReferenceLine y={0} stroke="var(--border)" />
                  <ChartTooltip
                    cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
                    content={<ChartTooltipContent formatter={(v, _n, entry) => (
                      entry?.payload?.flows ? <>{signed(v)} <span className="opacity-60">· aportación {signed(entry.payload.flows)}</span></> : signed(v)
                    )} />}
                  />
                  <Bar dataKey="gain" radius={[3, 3, 0, 0]} maxBarSize={22} animationDuration={400}>
                    {dailyBars.map((d, i) => <Cell key={i} fill={d.gain >= 0 ? GAIN : LOSS} />)}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </>
          )}
        </section>

        {/* Por meses */}
        {months.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">Por meses</h2>
            <div className="space-y-2">
              {months.map(m => (
                <div key={m.month} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 text-xs">
                  <span className="text-muted-foreground capitalize">{format(parseISO(`${m.month}-01`), 'MMM yy', { locale: es })}</span>
                  <span className="relative h-2 rounded-full bg-muted overflow-hidden">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ width: `${(Math.abs(m.gain) / maxMonthAbs) * 100}%`, backgroundColor: m.gain >= 0 ? GAIN : LOSS }}
                    />
                  </span>
                  <span className="text-right tabular-nums">
                    <span className={cn('font-semibold', tone(m.gain))}>{signed(m.gain)}</span>
                    <span className="text-muted-foreground"> · {pctFmt(m.twr, 1)}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="md:col-span-5 space-y-5">
        {pending.length > 0 && <PendingList pending={pending} accounts={accounts} onChanged={onChanged} />}
        <AccountsTable accounts={accounts} contributions={contributions} series={series} daily={daily} from={from} totalValue={totalValue} period={period} />
      </div>
    </div>
  );
}

function PendingList({ pending, accounts, onChanged }: { pending: InvContribution[]; accounts: InvAccount[]; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const markInvested = async (c: InvContribution) => {
    setBusy(c.id);
    const res = await setContributionInvested({ id: c.id, date: format(new Date(), 'yyyy-MM-dd') });
    setBusy(null);
    if (res.error) toast.error(res.error);
    else { toast.success('Marcada como invertida'); onChanged(); }
  };
  return (
    <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Clock className="w-4 h-4 text-amber-500" /> Pendientes de invertir
      </h2>
      <p className="text-xs text-muted-foreground mt-0.5">Se suman al valor hasta que el bróker las invierta, para que no parezcan pérdida.</p>
      <div className="mt-3 space-y-2">
        {pending.map(c => (
          <div key={c.id} className="flex items-center gap-3">
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold tabular-nums text-foreground">{fmt(Number(c.amount))}</span>
              <span className="block text-[11px] text-muted-foreground truncate">
                {accounts.find(a => a.id === c.account_id)?.name} · {format(parseISO(c.contribution_date), 'd MMM', { locale: es })}
              </span>
            </span>
            <button
              onClick={() => markInvested(c)}
              disabled={busy === c.id}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-semibold hover:bg-muted disabled:opacity-50"
            >
              Ya invertida
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function AccountsTable({ accounts, contributions, series, daily, from, totalValue, period }: {
  accounts: InvAccount[];
  contributions: InvContribution[];
  series: ReturnType<typeof buildSeries>['series'];
  daily: ReturnType<typeof buildSeries>['daily'];
  from: string | null;
  totalValue: number;
  period: Period;
}) {
  const latest = series[series.length - 1];
  const rows = accounts.map((acc, i) => {
    const value = latest?.perAccount[acc.id] ?? Number(acc.current_balance);
    const contributed = contributedTotal(acc, contributions);
    const gain = value - contributed;
    const stats = periodStats(daily, from, acc.id);
    return { acc, color: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length], value, contributed, gain, gainPct: contributed > 0 ? gain / contributed : 0, weight: totalValue > 0 ? value / totalValue : 0, stats };
  }).sort((a, b) => b.value - a.value);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-foreground">Por cuenta</h2>
      {/* Peso de cada cuenta en la cartera */}
      <div className="mt-3 flex h-2 gap-0.5 rounded-full overflow-hidden">
        {rows.map(r => <div key={r.acc.id} style={{ flexGrow: Math.max(r.weight, 0.001), backgroundColor: r.color }} title={`${r.acc.name}: ${Math.round(r.weight * 100)} %`} />)}
      </div>
      <div className="mt-4 space-y-4">
        {rows.map(r => (
          <div key={r.acc.id}>
            <div className="flex items-center gap-3">
              <BankLogo account={r.acc} size="md" />
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                  <span className="text-sm font-semibold text-foreground truncate">{r.acc.name}</span>
                </span>
                <span className="block text-[11px] text-muted-foreground tabular-nums">
                  {Math.round(r.weight * 100)} % de la cartera · aportado {fmt(r.contributed)}
                </span>
              </span>
              <span className="text-right shrink-0">
                <span className="block text-sm font-bold tabular-nums text-foreground">{fmt(r.value)}</span>
                <span className={cn('block text-[11px] font-semibold tabular-nums', tone(r.gain))}>{signed(r.gain)} ({pctFmt(r.gainPct, 1)})</span>
              </span>
            </div>
            {r.stats.days > 0 && (
              <p className="mt-1 pl-12 text-[11px] text-muted-foreground tabular-nums">
                {period}: <span className={cn('font-semibold', tone(r.stats.gain))}>{signed(r.stats.gain)} · {pctFmt(r.stats.twr)}</span>
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// Calendario (ganancia real de cada día: ya descuenta aportaciones)
// ---------------------------------------------------------------------------------------------

function CalendarTab({ daily }: { daily: ReturnType<typeof buildSeries>['daily'] }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const byDate = useMemo(() => new Map(daily.map(d => [d.date, d])), [daily]);
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const pad = (getDay(startOfMonth(month)) + 6) % 7;
  const key = format(month, 'yyyy-MM');
  const monthStats = periodStats(daily.filter(d => d.date.startsWith(key)), null);
  const maxAbs = Math.max(1, ...daily.filter(d => d.date.startsWith(key)).map(d => Math.abs(d.gain)));

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <button onClick={() => setMonth(m => subMonths(m, 1))} className="p-2 rounded-lg hover:bg-muted" aria-label="Mes anterior"><ChevronLeft className="w-4 h-4" /></button>
        <div className="text-center">
          <h2 className="text-sm font-semibold capitalize text-foreground">{format(month, 'MMMM yyyy', { locale: es })}</h2>
          {monthStats.days > 0 && (
            <p className={cn('text-xs font-semibold tabular-nums', tone(monthStats.gain))}>{signed(monthStats.gain)} · {pctFmt(monthStats.twr)}</p>
          )}
        </div>
        <button onClick={() => setMonth(m => addMonths(m, 1))} className="p-2 rounded-lg hover:bg-muted" aria-label="Mes siguiente"><ChevronRight className="w-4 h-4" /></button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => <span key={d}>{d}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: pad }).map((_, i) => <span key={`p${i}`} />)}
        {days.map(day => {
          const d = byDate.get(format(day, 'yyyy-MM-dd'));
          const intensity = d ? 0.15 + 0.6 * Math.min(1, Math.abs(d.gain) / maxAbs) : 0;
          return (
            <div
              key={day.toISOString()}
              className="aspect-square rounded-lg flex flex-col items-center justify-center text-[10px]"
              style={d ? { backgroundColor: `${d.gain >= 0 ? GAIN : LOSS}${Math.round(intensity * 255).toString(16).padStart(2, '0')}` } : { backgroundColor: 'var(--muted)' }}
              title={d ? `${signed(d.gain)} (${pctFmt(d.ret)})` : undefined}
            >
              <span className="font-semibold text-foreground">{format(day, 'd')}</span>
              {d && <span className="tabular-nums text-foreground/80 hidden sm:block">{Math.round(d.gain)}</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// Registros: aportaciones e historial de valores
// ---------------------------------------------------------------------------------------------

function RecordsTab({ accounts, snapshots, contributions, userId, onChanged }: {
  accounts: InvAccount[];
  snapshots: InvSnapshot[];
  contributions: InvContribution[];
  userId: string;
  onChanged: () => void;
}) {
  const supabase = createClient();
  const accName = (id: string) => accounts.find(a => a.id === id)?.name ?? 'Cuenta';
  const [form, setForm] = useState({ accountId: accounts[0]?.id ?? '', amount: '', date: format(new Date(), 'yyyy-MM-dd'), kind: 'in' as 'in' | 'out' });
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);

  /** Saldo de la cuenta = último valor apuntado + aportaciones aún pendientes. */
  const syncBalance = async (accountId: string, remaining: InvSnapshot[]) => {
    const last = remaining.filter(s => s.account_id === accountId).sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date))[0];
    if (!last) return;
    const pendingSum = contributions.filter(c => c.account_id === accountId && c.status === 'pending' && Number(c.amount) > 0).reduce((a, c) => a + Number(c.amount), 0);
    await supabase.from('accounts').update({ current_balance: Number(last.value) + pendingSum }).eq('id', accountId);
  };

  const addManual = async () => {
    const amount = Number.parseFloat(form.amount);
    const acc = accounts.find(a => a.id === form.accountId);
    if (!acc || !(amount > 0)) return;
    const signedAmount = form.kind === 'in' ? amount : -amount;
    setBusy(true);
    try {
      const { error } = await supabase.from('investment_contributions')
        .insert({ user_id: userId, account_id: acc.id, amount: signedAmount, contribution_date: form.date });
      if (error) throw error;
      const { error: e2 } = await supabase.from('accounts').update({ contributed_capital: Number(acc.contributed_capital || 0) + signedAmount }).eq('id', acc.id);
      if (e2) throw e2;
      toast.success(form.kind === 'in' ? 'Aportación registrada' : 'Retirada registrada');
      setForm(f => ({ ...f, amount: '' }));
      onChanged();
    } catch {
      toast.error('No se pudo guardar');
    } finally {
      setBusy(false);
    }
  };

  const deleteContribution = async (c: InvContribution) => {
    if (!confirm('¿Eliminar esta aportación?')) return;
    const acc = accounts.find(a => a.id === c.account_id);
    const { error } = await supabase.from('investment_contributions').delete().eq('id', c.id);
    if (error) { toast.error('No se pudo eliminar'); return; }
    // Solo las manuales subieron el capital al crearse; las fechadas a posteriori no.
    if ((c.source ?? 'manual') === 'manual' && acc) {
      await supabase.from('accounts').update({ contributed_capital: Number(acc.contributed_capital || 0) - Number(c.amount) }).eq('id', acc.id);
    }
    onChanged();
  };

  const saveSnapshot = async (s: InvSnapshot) => {
    const value = Number.parseFloat(editing?.value ?? '');
    if (!(value > 0)) return;
    const { error } = await supabase.from('investment_snapshots').update({ value }).eq('id', s.id);
    if (error) { toast.error('No se pudo actualizar'); return; }
    await syncBalance(s.account_id, snapshots.map(x => (x.id === s.id ? { ...x, value } : x)));
    setEditing(null);
    onChanged();
  };

  const deleteSnapshot = async (s: InvSnapshot) => {
    if (!confirm('¿Eliminar este registro?')) return;
    const { error } = await supabase.from('investment_snapshots').delete().eq('id', s.id);
    if (error) { toast.error('No se pudo eliminar'); return; }
    await syncBalance(s.account_id, snapshots.filter(x => x.id !== s.id));
    onChanged();
  };

  const sortedContribs = [...contributions].sort((a, b) => b.contribution_date.localeCompare(a.contribution_date));
  const sortedSnaps = [...snapshots].sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date)).slice(0, 60);

  return (
    <div className="md:grid md:grid-cols-2 md:gap-5 space-y-5 md:space-y-0">
      <ReviewContributions accounts={accounts} snapshots={snapshots} contributions={contributions} userId={userId} onChanged={onChanged} />
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Aportaciones</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Las transferencias a tus cuentas de inversión se apuntan solas. Añade aquí las que no pasen por la app.</p>
        </div>
        <div className="space-y-2 rounded-xl bg-muted/50 p-3">
          <div className="flex gap-1 p-0.5 bg-muted rounded-lg w-fit">
            {([['in', 'Aportación'], ['out', 'Retirada']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setForm(f => ({ ...f, kind: k }))} className={cn('px-3 py-1 rounded-md text-[11px] font-semibold', form.kind === k ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground')}>{l}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.accountId}
              onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
              className="h-10 rounded-xl border border-border bg-card px-2 text-sm"
              aria-label="Cuenta"
            >
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="h-10 rounded-xl border border-border bg-card px-2 text-sm" aria-label="Fecha" />
          </div>
          <div className="flex gap-2">
            <NumericInput value={form.amount} onValueChange={v => setForm(f => ({ ...f, amount: v }))} placeholder="Importe" currencySymbol="€" wrapperClassName="flex-1" className="h-10 bg-card border-border" />
            <button onClick={addManual} disabled={busy || !(Number.parseFloat(form.amount) > 0)} className="px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">Añadir</button>
          </div>
        </div>
        <div className="divide-y divide-border">
          {sortedContribs.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">Sin aportaciones registradas</p>}
          {sortedContribs.map(c => (
            <div key={c.id} className="flex items-center gap-3 py-2.5">
              <span className="flex-1 min-w-0">
                <span className={cn('block text-sm font-semibold tabular-nums', Number(c.amount) >= 0 ? 'text-foreground' : 'text-accent-600 dark:text-accent-400')}>{signed(Number(c.amount))}</span>
                <span className="block text-[11px] text-muted-foreground truncate">
                  {accName(c.account_id)} · {format(parseISO(c.contribution_date), 'd MMM yyyy', { locale: es })}
                  {c.source === 'transfer' && ' · automática'}
                  {c.source === 'backfill' && ' · fechada después'}
                  {c.status === 'pending' && ' · pendiente'}
                </span>
              </span>
              {c.source !== 'transfer' && (
                <button onClick={() => deleteContribution(c)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent-500/10 hover:text-accent-600" aria-label="Eliminar aportación"><Trash2 className="w-3.5 h-3.5" /></button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-foreground">Historial de valores</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Corrige o borra un valor mal apuntado.</p>
        <div className="mt-3 divide-y divide-border">
          {sortedSnaps.map(s => (
            <div key={s.id} className="flex items-center gap-3 py-2">
              <span className="flex-1 min-w-0">
                <span className="block text-sm text-foreground truncate">{accName(s.account_id)}</span>
                <span className="block text-[11px] text-muted-foreground">{format(parseISO(s.snapshot_date), 'EEE d MMM yyyy', { locale: es })}</span>
              </span>
              {editing?.id === s.id ? (
                <>
                  <NumericInput value={editing.value} onValueChange={v => setEditing({ id: s.id, value: v })} currencySymbol="€" wrapperClassName="w-28" className="h-9 text-right bg-muted/60 border-border tabular-nums" />
                  <button onClick={() => saveSnapshot(s)} className="px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">OK</button>
                </>
              ) : (
                <>
                  <span className="text-sm font-semibold tabular-nums text-foreground">{fmt(Number(s.value))}</span>
                  <button onClick={() => setEditing({ id: s.id, value: String(s.value) })} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted" aria-label="Editar valor"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => deleteSnapshot(s)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent-500/10 hover:text-accent-600" aria-label="Eliminar valor"><Trash2 className="w-3.5 h-3.5" /></button>
                </>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
