'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, TrendingUp, TrendingDown, Check, Loader2,
  ChevronLeft, ChevronRight, BarChart3, Pencil, Trash2, X, History
} from 'lucide-react';
import {
  format, parseISO, subDays, subMonths, addMonths,
  startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, getDay
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  Cell, ReferenceLine, Legend
} from 'recharts';
import { motion } from 'motion/react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

type Account = {
  id: string;
  name: string;
  current_balance: number;
  contributed_capital: number;
  banks?: { name: string; color: string; logo_url?: string } | null;
};

type Snapshot = {
  id: string;
  account_id: string;
  value: number;
  snapshot_date: string;
  user_id: string;
};

type Contribution = {
  id: string;
  account_id: string;
  amount: number;
  contribution_date: string;
  user_id: string;
};

type Props = {
  accounts: Account[];
  snapshots: Snapshot[];
  contributions: Contribution[];
  userId: string;
};

type Period = '7d' | '30d' | '90d' | '1y' | 'all';

export default function InvestmentsView({ accounts: initialAccounts, snapshots: initialSnapshots, contributions: initialContributions, userId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [snapshots, setSnapshots] = useState(initialSnapshots);
  const [contributions, setContributions] = useState(initialContributions);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [inputDates, setInputDates] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('30d');
  const [calMonth, setCalMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'position' | 'charts' | 'calendar'>('position');
  const [showPerAccount, setShowPerAccount] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [editingSnapshot, setEditingSnapshot] = useState<{ id: string; value: string } | null>(null);
  const [historyBusyId, setHistoryBusyId] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [contribInputs, setContribInputs] = useState<Record<string, string>>({});
  const [contribDates, setContribDates] = useState<Record<string, string>>({});
  const [savingContribId, setSavingContribId] = useState<string | null>(null);

  const ACCOUNT_COLORS = ['#52525b', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#f43f5e', '#84cc16'];

  const today = format(new Date(), 'yyyy-MM-dd');

  const getPeriodStart = (p: Period) =>
    p === '7d' ? subDays(new Date(), 7)
    : p === '30d' ? subDays(new Date(), 30)
    : p === '90d' ? subMonths(new Date(), 3)
    : p === '1y' ? subMonths(new Date(), 12)
    : new Date(2020, 0, 1);

  // --- Helpers ---
  // Snapshots por cuenta, ordenados por fecha, para poder "arrastrar" (forward-fill)
  // el último valor conocido de cada cuenta en fechas donde no se registró nada.
  const accountSnapshotsSorted = useMemo(() => {
    const map: Record<string, Snapshot[]> = {};
    for (const acc of accounts) {
      map[acc.id] = snapshots
        .filter(s => s.account_id === acc.id)
        .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
    }
    return map;
  }, [snapshots, accounts]);

  const valueForAccountAtDate = (accountId: string, date: string): number | undefined => {
    const list = accountSnapshotsSorted[accountId] || [];
    let result: number | undefined;
    for (const s of list) {
      if (s.snapshot_date <= date) result = s.value;
      else break;
    }
    return result;
  };

  // Fechas con al menos un registro de alguna cuenta (unión, no solo las que coinciden en todas)
  const sortedDates = useMemo(() =>
    Array.from(new Set(snapshots.map(s => s.snapshot_date))).sort(),
  [snapshots]);

  // Total del portfolio por fecha, arrastrando el último valor conocido de cada cuenta
  // (si una cuenta no tiene registro ese día, no cuenta como "perdido": se usa su último valor).
  const totalByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const date of sortedDates) {
      let total = 0;
      for (const acc of accounts) {
        total += valueForAccountAtDate(acc.id, date) ?? acc.current_balance;
      }
      map[date] = total;
    }
    return map;
  }, [sortedDates, accounts, accountSnapshotsSorted]);

  const getLatestSnapshot = (accountId: string): Snapshot | undefined => {
    const accs = accountSnapshotsSorted[accountId] || [];
    return accs[accs.length - 1];
  };

  const getTotalForDaysBack = (daysBack: number) => {
    const target = format(subDays(new Date(), daysBack), 'yyyy-MM-dd');
    let total = 0;
    for (const acc of accounts) {
      const accs = snapshots.filter(s => s.account_id === acc.id && s.snapshot_date <= target);
      const closest = accs[accs.length - 1];
      total += closest?.value ?? acc.current_balance;
    }
    return total;
  };

  const totalValue = useMemo(() => {
    let total = 0;
    for (const acc of accounts) {
      const latest = getLatestSnapshot(acc.id);
      total += latest?.value ?? acc.current_balance;
    }
    return total;
  }, [accounts, snapshots]);

  const totalYesterday = getTotalForDaysBack(1);
  const dailyChange = totalValue - totalYesterday;

  // --- Aportaciones vs. rendimiento real ---
  // El capital aportado a cada cuenta se introduce manualmente (bloque "Configurar aportaciones"),
  // en vez de inferirse de las transferencias: el dinero de una transferencia puede tardar días en
  // reflejarse en el fondo, lo que descuadraba el cálculo automático. Cada cambio de aportación se
  // registra con la fecha que el usuario elija (normalmente el día que el dinero llega al fondo),
  // para poder restarlo del cambio diario y que no se cuente como rendimiento de mercado.
  const totalContributed = useMemo(() =>
    accounts.reduce((sum, acc) => sum + (acc.contributed_capital || 0), 0),
  [accounts]);

  const realGain = totalValue - totalContributed;
  const realGainPct = totalContributed > 0 ? (realGain / totalContributed) * 100 : 0;

  // Suma de aportaciones/retiradas con fecha en (fromExclusive, toInclusive]
  const netContributionInRange = (fromExclusive: string, toInclusive: string): number => {
    return contributions.reduce((sum, c) => {
      if (c.contribution_date > fromExclusive && c.contribution_date <= toInclusive) {
        return sum + c.amount;
      }
      return sum;
    }, 0);
  };

  const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const contributionToday = netContributionInRange(yesterdayStr, today);
  const realGainToday = dailyChange - contributionToday;
  const realGainTodayPct = totalYesterday > 0 ? (realGainToday / totalYesterday) * 100 : 0;

  // --- Daily Changes (bar chart data) ---
  const dailyChangesData = useMemo(() => {
    const periodStart = getPeriodStart(period);
    const startStr = format(periodStart, 'yyyy-MM-dd');

    const filtered = sortedDates.filter(d => d >= startStr);
    const result: { date: string; label: string; change: number; value: number; contribution: number; realGain: number }[] = [];

    for (let i = 0; i < filtered.length; i++) {
      const date = filtered[i];
      const val = totalByDate[date];
      const prevVal = i > 0 ? totalByDate[filtered[i - 1]] : val;
      const prevDate = i > 0 ? filtered[i - 1] : date;
      const contribution = netContributionInRange(prevDate, date);
      const change = val - prevVal;
      result.push({
        date,
        label: format(parseISO(date), 'd MMM', { locale: es }),
        change,
        contribution,
        realGain: change - contribution,
        value: val,
      });
    }
    return result;
  }, [snapshots, contributions, period, sortedDates, totalByDate]);

  // --- Portfolio evolution (area chart data) ---
  const evolutionData = useMemo(() => {
    const periodStart = getPeriodStart(period);
    const startStr = format(periodStart, 'yyyy-MM-dd');

    return sortedDates
      .filter(d => d >= startStr)
      .map(date => ({
        date,
        label: format(parseISO(date), 'd MMM', { locale: es }),
        value: totalByDate[date],
      }));
  }, [snapshots, period, sortedDates, totalByDate]);

  // --- Per-account evolution (para el toggle "por cuenta") ---
  const perAccountEvolutionData = useMemo(() => {
    const periodStart = getPeriodStart(period);
    const startStr = format(periodStart, 'yyyy-MM-dd');

    return sortedDates
      .filter(d => d >= startStr)
      .map(date => {
        const row: Record<string, number | string> = {
          date,
          label: format(parseISO(date), 'd MMM', { locale: es }),
        };
        for (const acc of accounts) {
          row[acc.id] = valueForAccountAtDate(acc.id, date) ?? acc.current_balance;
        }
        return row;
      });
  }, [snapshots, period, sortedDates, accounts, accountSnapshotsSorted]);

  const dailyChangeConfig: ChartConfig = { realGain: { label: 'Rendimiento real' } };
  const portfolioConfig: ChartConfig = { value: { label: 'Portfolio', color: '#52525b' } };
  const perAccountConfig: ChartConfig = useMemo(() => Object.fromEntries(
    accounts.map((acc, i) => [acc.id, { label: acc.name, color: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length] }])
  ), [accounts]);

  // --- Calendar data ---
  const calendarGains = useMemo(() => {
    const gains: Record<string, number> = {};
    for (let i = 1; i < sortedDates.length; i++) {
      const date = sortedDates[i];
      gains[date] = totalByDate[date] - totalByDate[sortedDates[i - 1]];
    }
    return gains;
  }, [sortedDates, totalByDate]);

  const calDays = eachDayOfInterval({
    start: startOfMonth(calMonth),
    end: endOfMonth(calMonth),
  });
  const calStartPad = (getDay(startOfMonth(calMonth)) + 6) % 7;

  // --- Save handler ---
  const handleSaveValue = async (accountId: string) => {
    const value = parseFloat(inputValues[accountId]);
    if (isNaN(value) || value <= 0) return;
    const selectedDate = inputDates[accountId] || today;
    setSavingId(accountId);
    try {
      const { data, error } = await supabase
        .from('investment_snapshots')
        .upsert(
          { user_id: userId, account_id: accountId, value, snapshot_date: selectedDate },
          { onConflict: 'account_id,snapshot_date' }
        )
        .select().single();
      if (error) throw error;

      setSnapshots(prev => {
        const filtered = prev.filter(s => !(s.account_id === accountId && s.snapshot_date === selectedDate));
        return [...filtered, data].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
      });
      // Si la fecha introducida es la más reciente que tiene la cuenta (normalmente hoy),
      // el saldo actual de la cuenta también se actualiza, tanto en BD como en la UI.
      const isLatestForAccount = !accountSnapshotsSorted[accountId]?.some(s => s.snapshot_date > selectedDate);
      if (isLatestForAccount) {
        await supabase.from('accounts').update({ current_balance: value }).eq('id', accountId);
        setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, current_balance: value } : a));
      }
      setInputValues(prev => ({ ...prev, [accountId]: '' }));
      setInputDates(prev => ({ ...prev, [accountId]: '' }));
      setSavedId(accountId);
      setTimeout(() => setSavedId(null), 2000);
      router.refresh();
    } catch { toast.error('Error al guardar'); }
    finally { setSavingId(null); }
  };

  // --- Save contributed capital (aportación manual, con fecha propia en vez de la de la transferencia) ---
  const handleSaveContributed = async (accountId: string) => {
    const value = parseFloat(contribInputs[accountId]);
    if (isNaN(value) || value < 0) return;
    const account = accounts.find(a => a.id === accountId);
    const delta = value - (account?.contributed_capital || 0);
    const logDate = contribDates[accountId] || today;
    setSavingContribId(accountId);
    try {
      const { error } = await supabase.from('accounts').update({ contributed_capital: value }).eq('id', accountId);
      if (error) throw error;

      if (delta !== 0) {
        const { data: contribRow, error: logError } = await supabase
          .from('investment_contributions')
          .insert({ user_id: userId, account_id: accountId, amount: delta, contribution_date: logDate })
          .select().single();
        if (logError) throw logError;
        setContributions(prev => [...prev, contribRow]);
      }

      setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, contributed_capital: value } : a));
      setContribInputs(prev => ({ ...prev, [accountId]: '' }));
      setContribDates(prev => ({ ...prev, [accountId]: '' }));
      router.refresh();
    } catch { toast.error('Error al guardar la aportación'); }
    finally { setSavingContribId(null); }
  };

  // Recalcula el saldo de una cuenta a partir de su snapshot más reciente restante (o el propio balance si no queda ninguno)
  const syncAccountBalanceFromSnapshots = async (accountId: string, remainingSnapshots: Snapshot[]) => {
    const accSnapshots = remainingSnapshots.filter(s => s.account_id === accountId).sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
    const latest = accSnapshots[accSnapshots.length - 1];
    if (latest) {
      await supabase.from('accounts').update({ current_balance: latest.value }).eq('id', accountId);
      setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, current_balance: latest.value } : a));
    }
  };

  const handleUpdateSnapshot = async (snapshot: Snapshot) => {
    if (!editingSnapshot || editingSnapshot.id !== snapshot.id) return;
    const value = parseFloat(editingSnapshot.value);
    if (isNaN(value) || value <= 0) return;

    setHistoryBusyId(snapshot.id);
    try {
      const { error } = await supabase.from('investment_snapshots').update({ value }).eq('id', snapshot.id);
      if (error) throw error;

      const nextSnapshots = snapshots.map(s => s.id === snapshot.id ? { ...s, value } : s);
      setSnapshots(nextSnapshots);
      await syncAccountBalanceFromSnapshots(snapshot.account_id, nextSnapshots);
      setEditingSnapshot(null);
      router.refresh();
    } catch {
      toast.error('Error al actualizar el registro');
    } finally {
      setHistoryBusyId(null);
    }
  };

  const handleDeleteSnapshot = async (snapshot: Snapshot) => {
    if (!confirm('¿Eliminar este registro del historial?')) return;
    setHistoryBusyId(snapshot.id);
    try {
      const { error } = await supabase.from('investment_snapshots').delete().eq('id', snapshot.id);
      if (error) throw error;

      const nextSnapshots = snapshots.filter(s => s.id !== snapshot.id);
      setSnapshots(nextSnapshots);
      await syncAccountBalanceFromSnapshots(snapshot.account_id, nextSnapshots);
      router.refresh();
    } catch {
      toast.error('Error al eliminar el registro');
    } finally {
      setHistoryBusyId(null);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
  const fmtShort = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(2) + '€';

  // --- Empty state ---
  if (accounts.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-32 md:pb-8">
        <div className="sticky top-0 z-20 glass-nav border-b px-5 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-muted"><ArrowLeft className="w-5 h-5 text-foreground" /></Link>
            <h1 className="text-lg font-semibold text-foreground">Inversiones</h1>
            <div className="w-9" />
          </div>
        </div>
        <div className="flex flex-col items-center justify-center px-5 pt-20 text-center">
          <BarChart3 className="w-16 h-16 text-muted-foreground/60 mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Sin cuentas de inversión</h2>
          <p className="text-muted-foreground text-sm max-w-sm mb-6">Crea una cuenta con tipo "Inversión" para empezar.</p>
          <Link href="/dashboard/cuentas" className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold">Ir a Cuentas</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 glass-nav border-b px-5 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-muted"><ArrowLeft className="w-5 h-5 text-foreground" /></Link>
          <h1 className="text-lg font-semibold text-foreground">Inversiones</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 py-6 space-y-5">

        {/* Segmented control: Posición/Registro | Gráficos | Calendario */}
        <div className="relative flex items-center bg-muted rounded-xl p-1">
          {([
            ['position', 'Posición'],
            ['charts', 'Gráficos'],
            ['calendar', 'Calendario'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'relative flex-1 rounded-lg py-2 text-sm font-semibold transition-colors',
                activeTab === key ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {activeTab === key && (
                <motion.span
                  layoutId="investments-tab-segment"
                  className="absolute inset-0 rounded-lg bg-card shadow-sm"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative z-10">{label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'position' && (
        <>

        {/* Portfolio Total */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Portfolio Total</p>
          <p className="text-4xl font-black tracking-tight tabular-nums text-foreground font-mono">{fmt(totalValue)}</p>

          {totalContributed > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1">Rendimiento real</p>
              <div className="flex items-baseline gap-2">
                <p className={`text-2xl font-black font-mono tabular-nums ${realGain >= 0 ? 'text-secondary-600 dark:text-secondary-400' : 'text-accent-600 dark:text-accent-400'}`}>{fmtShort(realGain)}</p>
                <span className={`text-sm font-bold ${realGain >= 0 ? 'text-secondary-600 dark:text-secondary-400' : 'text-accent-600 dark:text-accent-400'}`}>
                  {realGainPct >= 0 ? '+' : ''}{realGainPct.toFixed(2)}%
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">sobre {fmt(totalContributed)} aportados</p>
            </div>
          )}

          <div className="flex items-center gap-2 mt-3">
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold ${realGainToday >= 0 ? 'bg-secondary-500/10 text-secondary-600 dark:text-secondary-400' : 'bg-accent-500/10 text-accent-600 dark:text-accent-400'}`}>
              {realGainToday >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {fmtShort(realGainToday)}
              <span className="font-normal opacity-70">({realGainTodayPct >= 0 ? '+' : ''}{realGainTodayPct.toFixed(2)}%)</span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              hoy{contributionToday !== 0 ? ` · aportaste ${fmtShort(contributionToday)}` : ''}
            </span>
          </div>
        </div>

        {/* Comparison strip */}
        <div className="grid grid-cols-3 gap-2">
          {[{ label: 'Ayer', d: 1 }, { label: '7 días', d: 7 }, { label: '30 días', d: 30 }].map(({ label, d }) => {
            const prev = getTotalForDaysBack(d);
            const diff = totalValue - prev;
            const pct = prev > 0 ? (diff / prev) * 100 : 0;
            return (
              <div key={label} className="bg-card rounded-xl border border-border p-3 text-center">
                <p className="text-[10px] text-muted-foreground font-medium uppercase">{label}</p>
                <p className={`text-base font-black font-mono ${diff >= 0 ? 'text-secondary-600 dark:text-secondary-400' : 'text-accent-600 dark:text-accent-400'}`}>{fmtShort(diff)}</p>
                <p className={`text-[10px] font-semibold ${diff >= 0 ? 'text-secondary-500 dark:text-secondary-400' : 'text-accent-500 dark:text-accent-400'}`}>{pct >= 0 ? '+' : ''}{pct.toFixed(2)}%</p>
              </div>
            );
          })}
        </div>

        {/* Input Cards */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Registrar Valor</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {accounts.map(acc => {
              const latest = getLatestSnapshot(acc.id);
              const hasToday = latest?.snapshot_date === today;
              return (
                <div key={acc.id} className="bg-card rounded-2xl border border-border p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-bold text-white overflow-hidden shrink-0"
                      style={{ backgroundColor: acc.banks?.logo_url ? 'transparent' : (acc.banks?.color || '#52525b') }}>
                      {acc.banks?.logo_url ? <img src={acc.banks.logo_url} alt="" className="w-full h-full object-contain" /> : acc.banks?.name?.substring(0, 2).toUpperCase() || '€'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{acc.name}</p>
                      <p className="text-lg font-black text-foreground font-mono">{fmt(latest?.value ?? acc.current_balance)}</p>
                    </div>
                    {hasToday && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-secondary-600 dark:text-secondary-400 bg-secondary-500/10 px-2 py-0.5 rounded-full shrink-0">
                        <Check className="w-3 h-3" /> Hoy
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 min-w-0">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">€</span>
                      <input type="number" step="0.01" inputMode="decimal" pattern="[0-9]*" placeholder={latest?.value?.toFixed(2) || '0.00'} value={inputValues[acc.id] || ''}
                        onChange={(e) => setInputValues(prev => ({ ...prev, [acc.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveValue(acc.id); }}
                        className="w-full bg-muted/60 border border-border rounded-xl pl-8 pr-3 py-2.5 text-sm font-mono font-medium text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-ring focus:bg-card outline-none" />
                    </div>
                    <input type="date" value={inputDates[acc.id] || today}
                      onChange={(e) => setInputDates(prev => ({ ...prev, [acc.id]: e.target.value }))}
                      className="shrink-0 w-[112px] bg-muted/60 border border-border rounded-xl px-2 py-2.5 text-xs font-medium text-foreground outline-none" />
                    <button onClick={() => handleSaveValue(acc.id)} disabled={!inputValues[acc.id] || savingId === acc.id}
                      className="shrink-0 whitespace-nowrap px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:bg-muted disabled:text-muted-foreground">
                      {savingId === acc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : savedId === acc.id ? <Check className="w-4 h-4" /> : 'OK'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Configurar aportaciones: capital invertido manualmente por cuenta */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <button
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Configurar aportaciones</span>
              <span className="text-xs text-muted-foreground">({fmt(totalContributed)})</span>
            </div>
            <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isConfigOpen ? 'rotate-90' : ''}`} />
          </button>
          {isConfigOpen && (
            <div className="border-t border-border divide-y divide-border">
              <p className="px-4 py-2.5 text-[11px] text-muted-foreground">
                Indica cuánto dinero llevas metido en total en cada fondo (no el de hoy: el acumulado). Cuando aportes más, súmalo aquí con la fecha en que el dinero aparezca reflejado en el fondo — así no se cuenta como rendimiento del mercado.
              </p>
              {accounts.map(acc => {
                const accGain = (acc.current_balance ?? 0) - (acc.contributed_capital || 0);
                return (
                  <div key={acc.id} className="px-4 py-3 space-y-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{acc.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Aportado {fmt(acc.contributed_capital || 0)}
                        {acc.contributed_capital > 0 && (
                          <span className={`ml-1.5 font-semibold ${accGain >= 0 ? 'text-secondary-600 dark:text-secondary-400' : 'text-accent-600 dark:text-accent-400'}`}>
                            ({fmtShort(accGain)})
                          </span>
                        )}
                      </p>
                    </div>
                    {/* Fila fija (sin wrap): el input de importe cede el espacio que le sobra a
                        fecha + botón, así el check nunca "salta" a su propia línea. */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1 min-w-0">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">€</span>
                        <input
                          type="number" step="0.01" inputMode="decimal" pattern="[0-9]*" placeholder={(acc.contributed_capital || 0).toFixed(2)}
                          value={contribInputs[acc.id] || ''}
                          onChange={(e) => setContribInputs(prev => ({ ...prev, [acc.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveContributed(acc.id); }}
                          className="w-full bg-muted/60 border border-border rounded-lg pl-6 pr-2 py-1.5 text-xs font-mono font-medium text-foreground outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <input type="date" value={contribDates[acc.id] || today}
                        onChange={(e) => setContribDates(prev => ({ ...prev, [acc.id]: e.target.value }))}
                        className="shrink-0 w-[104px] bg-muted/60 border border-border rounded-lg px-2 py-1.5 text-[11px] font-medium text-foreground outline-none" />
                      <button
                        onClick={() => handleSaveContributed(acc.id)}
                        disabled={!contribInputs[acc.id] || savingContribId === acc.id}
                        className="shrink-0 whitespace-nowrap p-1.5 bg-primary text-primary-foreground rounded-lg disabled:bg-muted disabled:text-muted-foreground"
                      >
                        {savingContribId === acc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Historial de registros (editable, por si un valor se introdujo mal) */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <button
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Historial de registros</span>
              <span className="text-xs text-muted-foreground">({snapshots.length})</span>
            </div>
            <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isHistoryOpen ? 'rotate-90' : ''}`} />
          </button>
          {isHistoryOpen && (
            <div className="border-t border-border max-h-[320px] overflow-y-auto divide-y divide-border">
              {[...snapshots].sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date)).map(s => {
                const acc = accounts.find(a => a.id === s.account_id);
                const isEditing = editingSnapshot?.id === s.id;
                const isBusy = historyBusyId === s.id;
                return (
                  <div key={s.id} className="px-4 py-2.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{acc?.name || 'Cuenta'}</p>
                      <p className="text-[11px] text-muted-foreground">{format(parseISO(s.snapshot_date), 'd MMM yyyy', { locale: es })}</p>
                    </div>
                    {isEditing ? (
                      <>
                        <div className="relative w-28 shrink-0">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">€</span>
                          <input
                            type="number" step="0.01" inputMode="decimal" pattern="[0-9]*" autoFocus value={editingSnapshot.value}
                            onChange={(e) => setEditingSnapshot({ id: s.id, value: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateSnapshot(s); }}
                            className="w-full bg-muted/60 border border-border rounded-lg pl-6 pr-2 py-1.5 text-xs font-mono font-medium text-foreground outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                        <button onClick={() => handleUpdateSnapshot(s)} disabled={isBusy} className="p-1.5 bg-secondary-500/10 text-secondary-600 dark:text-secondary-400 hover:bg-secondary-500/20 rounded-lg shrink-0">
                          {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => setEditingSnapshot(null)} className="p-1.5 bg-muted text-muted-foreground hover:bg-muted rounded-lg shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-xs font-bold font-mono text-foreground shrink-0">{fmt(s.value)}</span>
                        <button onClick={() => setEditingSnapshot({ id: s.id, value: s.value.toString() })} className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg shrink-0">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteSnapshot(s)} disabled={isBusy} className="p-1.5 text-accent-500 dark:text-accent-400 hover:bg-accent-500/10 rounded-lg shrink-0">
                          {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
              {snapshots.length === 0 && (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground">Sin registros todavía</div>
              )}
            </div>
          )}
        </div>

        </>
        )}

        {activeTab === 'charts' && (
          <>
            {/* Period Selector */}
            <div className="flex items-center gap-2">
              {([['7d', '7D'], ['30d', '1M'], ['90d', '3M'], ['1y', '1A'], ['all', 'Todo']] as [Period, string][]).map(([key, label]) => (
                <button key={key} onClick={() => setPeriod(key)} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${period === key ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground'}`}>{label}</button>
              ))}
            </div>

            {/* Daily Changes BarChart */}
            {dailyChangesData.length > 1 && (
              <div className="bg-card rounded-2xl border border-border p-5">
                <h3 className="text-sm font-semibold text-foreground mb-1">Ganancia / Pérdida Diaria</h3>
                <p className="text-xs text-muted-foreground mb-4">Diferencia vs. día anterior</p>
                <ChartContainer config={dailyChangeConfig} className="h-[180px]">
                  <BarChart data={dailyChangesData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                    <ReferenceLine y={0} stroke="var(--border)" />
                    <ChartTooltip
                      cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
                      content={
                        <ChartTooltipContent
                          formatter={(val, _name, entry) => {
                            const contribution = entry?.payload?.contribution ?? 0;
                            return contribution !== 0
                              ? <>{fmtShort(val)} <span className="opacity-60">· Aportación {fmtShort(contribution)}</span></>
                              : fmtShort(val);
                          }}
                        />
                      }
                    />
                    <Bar dataKey="realGain" name="Rendimiento real" radius={[3, 3, 0, 0]} maxBarSize={24} animationDuration={500} animationEasing="ease-out">
                      {dailyChangesData.map((entry, i) => (
                        <Cell key={i} fill={entry.realGain >= 0 ? '#10b981' : '#f43f5e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </div>
            )}

            {/* Portfolio Evolution */}
            {evolutionData.length > 1 && (
              <div className="bg-card rounded-2xl border border-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground">Evolución del Portfolio</h3>
                  {accounts.length > 1 && (
                    <div className="flex bg-muted rounded-lg p-0.5">
                      <button onClick={() => setShowPerAccount(false)} className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${!showPerAccount ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>Total</button>
                      <button onClick={() => setShowPerAccount(true)} className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${showPerAccount ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>Por cuenta</button>
                    </div>
                  )}
                </div>
                {showPerAccount && accounts.length > 1 ? (
                  <ChartContainer config={perAccountConfig} className="h-[220px]">
                    <LineChart data={perAccountEvolutionData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                      <ChartTooltip content={<ChartTooltipContent formatter={(val) => `${val.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€`} />} />
                      <Legend wrapperStyle={{ fontSize: '10px' }} formatter={(value: string) => accounts.find(a => a.id === value)?.name || value} />
                      {accounts.map((acc, i) => (
                        <Line key={acc.id} type="monotone" dataKey={acc.id} name={acc.id} stroke={ACCOUNT_COLORS[i % ACCOUNT_COLORS.length]} strokeWidth={2} dot={perAccountEvolutionData.length <= 10} animationDuration={600} animationEasing="ease-out" />
                      ))}
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <ChartContainer config={portfolioConfig} className="h-[180px]">
                    <AreaChart data={evolutionData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradPort" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#52525b" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#52525b" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9 }}
                        domain={[(min: number) => Math.floor(min * 0.998), (max: number) => Math.ceil(max * 1.002)]} />
                      <ChartTooltip content={<ChartTooltipContent formatter={(val) => `${val.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€`} />} />
                      <Area type="monotone" dataKey="value" name="Portfolio" stroke="#52525b" strokeWidth={2} fill="url(#gradPort)" dot={evolutionData.length <= 10} animationDuration={600} animationEasing="ease-out" />
                    </AreaChart>
                  </ChartContainer>
                )}
              </div>
            )}

            {/* Per-account sparklines */}
            {accounts.length > 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {accounts.map(acc => {
                  const periodStart = getPeriodStart(period);
                  const startStr = format(periodStart, 'yyyy-MM-dd');
                  const accData = snapshots.filter(s => s.account_id === acc.id && s.snapshot_date >= startStr)
                    .map(s => ({ label: format(parseISO(s.snapshot_date), 'd', { locale: es }), value: s.value }));
                  if (accData.length < 2) return null;
                  const change = accData[accData.length - 1].value - accData[0].value;
                  const changePct = accData[0].value !== 0 ? (change / accData[0].value) * 100 : 0;
                  const isUp = change >= 0;
                  return (
                    <div key={acc.id} className="bg-card rounded-2xl border border-border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-foreground truncate">{acc.name}</p>
                        <span className={`text-xs font-bold tabular-nums ${isUp ? 'text-secondary-600 dark:text-secondary-400' : 'text-accent-600 dark:text-accent-400'}`}>
                          {fmtShort(change)} <span className="font-semibold opacity-70">({changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%)</span>
                        </span>
                      </div>
                      <ChartContainer config={{ value: { label: acc.name, color: isUp ? '#10b981' : '#f43f5e' } }} className="h-[60px]">
                        <AreaChart data={accData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                          <defs><linearGradient id={`g-${acc.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={isUp ? '#10b981' : '#f43f5e'} stopOpacity={0.4} /><stop offset="95%" stopColor={isUp ? '#10b981' : '#f43f5e'} stopOpacity={0.05} /></linearGradient></defs>
                          <YAxis hide domain={[(min: number) => min * 0.998, (max: number) => max * 1.002]} />
                          <Area type="monotone" dataKey="value" stroke={isUp ? '#10b981' : '#f43f5e'} strokeWidth={1.5} fill={`url(#g-${acc.id})`} dot={false} animationDuration={500} animationEasing="ease-out" />
                        </AreaChart>
                      </ChartContainer>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-4">
            {/* Month navigation */}
            <div className="flex items-center justify-between">
              <button onClick={() => setCalMonth(subMonths(calMonth, 1))} className="p-2 hover:bg-muted rounded-xl"><ChevronLeft className="w-5 h-5 text-muted-foreground" /></button>
              <h2 className="text-base font-semibold text-foreground capitalize">{format(calMonth, 'MMMM yyyy', { locale: es })}</h2>
              <button onClick={() => setCalMonth(addMonths(calMonth, 1))} className="p-2 hover:bg-muted rounded-xl"><ChevronRight className="w-5 h-5 text-muted-foreground" /></button>
            </div>

            {/* Monthly summary */}
            {(() => {
              const monthGains = Object.entries(calendarGains).filter(([d]) => isSameMonth(parseISO(d), calMonth));
              const totalGain = monthGains.reduce((s, [, v]) => s + v, 0);
              const positiveDays = monthGains.filter(([, v]) => v > 0).length;
              const negativeDays = monthGains.filter(([, v]) => v < 0).length;
              return (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-card rounded-xl border border-border p-3 text-center">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase">Balance mes</p>
                    <p className={`text-base font-black font-mono ${totalGain >= 0 ? 'text-secondary-600 dark:text-secondary-400' : 'text-accent-600 dark:text-accent-400'}`}>{fmtShort(totalGain)}</p>
                  </div>
                  <div className="bg-secondary-500/10 rounded-xl border border-secondary-500/20 p-3 text-center">
                    <p className="text-[10px] text-secondary-600 dark:text-secondary-400 font-medium uppercase">Días en verde</p>
                    <p className="text-base font-black text-secondary-700 dark:text-secondary-400">{positiveDays}</p>
                  </div>
                  <div className="bg-accent-500/10 rounded-xl border border-accent-500/20 p-3 text-center">
                    <p className="text-[10px] text-accent-600 dark:text-accent-400 font-medium uppercase">Días en rojo</p>
                    <p className="text-base font-black text-accent-700 dark:text-accent-400">{negativeDays}</p>
                  </div>
                </div>
              );
            })()}

            {/* Calendar grid */}
            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground uppercase py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: calStartPad }).map((_, i) => <div key={`p-${i}`} className="aspect-square" />)}
                {calDays.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const gain = calendarGains[dateStr];
                  const hasData = gain !== undefined;
                  const isPos = hasData && gain > 0;
                  const isNeg = hasData && gain < 0;
                  const isToday = isSameDay(day, new Date());
                  const intensity = hasData ? Math.min(Math.abs(gain) / 10, 1) : 0;

                  return (
                    <div key={dateStr} className={`aspect-square rounded-lg flex flex-col items-center justify-center p-0.5 transition-all ${isToday ? 'ring-2 ring-neutral-900 ring-offset-1' : ''}`}
                      style={{
                        backgroundColor: !hasData ? 'transparent' :
                          isPos ? `rgba(16, 185, 129, ${0.1 + intensity * 0.3})` :
                          `rgba(244, 63, 94, ${0.1 + intensity * 0.3})`,
                      }}>
                      <span className="text-[10px] font-medium text-foreground">{format(day, 'd')}</span>
                      {hasData && (
                        <span className={`text-[7px] font-bold leading-none ${isPos ? 'text-secondary-700 dark:text-secondary-400' : isNeg ? 'text-accent-700 dark:text-accent-400' : 'text-muted-foreground'}`}>
                          {gain >= 0 ? '+' : ''}{gain.toFixed(0)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Daily breakdown list for the month */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-xs font-semibold text-foreground">Detalle diario</p>
              </div>
              <div className="max-h-[300px] overflow-y-auto divide-y divide-border">
                {Object.entries(calendarGains)
                  .filter(([d]) => isSameMonth(parseISO(d), calMonth))
                  .sort((a, b) => b[0].localeCompare(a[0]))
                  .map(([date, gain]) => (
                    <div key={date} className="px-4 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${gain >= 0 ? 'bg-secondary-500' : 'bg-accent-500'}`} />
                        <span className="text-xs font-medium text-foreground">{format(parseISO(date), "EEEE d", { locale: es })}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground tabular-nums">{fmt(totalByDate[date] ?? 0)}</span>
                        <span className={`text-xs font-bold font-mono ${gain >= 0 ? 'text-secondary-600 dark:text-secondary-400' : 'text-accent-600 dark:text-accent-400'}`}>{fmtShort(gain)}</span>
                      </div>
                    </div>
                  ))}
                {Object.entries(calendarGains).filter(([d]) => isSameMonth(parseISO(d), calMonth)).length === 0 && (
                  <div className="px-4 py-8 text-center text-xs text-muted-foreground">Sin datos este mes</div>
                )}
              </div>
            </div>
          </div>
        )}

        {snapshots.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Registra el valor de tus inversiones cada día para ver la evolución.
          </div>
        )}
      </div>
    </div>
  );
}
