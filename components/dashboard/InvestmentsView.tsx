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
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine, Legend
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';

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

type Props = {
  accounts: Account[];
  snapshots: Snapshot[];
  userId: string;
};

type Period = '7d' | '30d' | '90d' | 'all';

export default function InvestmentsView({ accounts: initialAccounts, snapshots: initialSnapshots, userId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [snapshots, setSnapshots] = useState(initialSnapshots);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [inputDates, setInputDates] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('30d');
  const [calMonth, setCalMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'charts' | 'calendar'>('charts');
  const [showPerAccount, setShowPerAccount] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [editingSnapshot, setEditingSnapshot] = useState<{ id: string; value: string } | null>(null);
  const [historyBusyId, setHistoryBusyId] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [contribInputs, setContribInputs] = useState<Record<string, string>>({});
  const [savingContribId, setSavingContribId] = useState<string | null>(null);

  const ACCOUNT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#f43f5e', '#84cc16'];

  const today = format(new Date(), 'yyyy-MM-dd');

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
  const dailyChangePct = totalYesterday > 0 ? (dailyChange / totalYesterday) * 100 : 0;

  // --- Aportaciones vs. rendimiento real ---
  // El capital aportado a cada cuenta se introduce manualmente (bloque "Configurar aportaciones"),
  // en vez de inferirse de las transferencias: el dinero de una transferencia puede tardar días en
  // reflejarse en el fondo, lo que descuadraba el cálculo automático.
  const totalContributed = useMemo(() =>
    accounts.reduce((sum, acc) => sum + (acc.contributed_capital || 0), 0),
  [accounts]);

  const realGain = totalValue - totalContributed;
  const realGainPct = totalContributed > 0 ? (realGain / totalContributed) * 100 : 0;

  // --- Daily Changes (bar chart data) ---
  const dailyChangesData = useMemo(() => {
    const periodStart = period === '7d' ? subDays(new Date(), 7)
      : period === '30d' ? subDays(new Date(), 30)
      : period === '90d' ? subMonths(new Date(), 3)
      : new Date(2020, 0, 1);
    const startStr = format(periodStart, 'yyyy-MM-dd');

    const filtered = sortedDates.filter(d => d >= startStr);
    const result: { date: string; label: string; change: number; value: number }[] = [];

    for (let i = 0; i < filtered.length; i++) {
      const date = filtered[i];
      const val = totalByDate[date];
      const prevVal = i > 0 ? totalByDate[filtered[i - 1]] : val;
      result.push({
        date,
        label: format(parseISO(date), 'd MMM', { locale: es }),
        change: val - prevVal,
        value: val,
      });
    }
    return result;
  }, [snapshots, period, sortedDates, totalByDate]);

  // --- Portfolio evolution (area chart data) ---
  const evolutionData = useMemo(() => {
    const periodStart = period === '7d' ? subDays(new Date(), 7)
      : period === '30d' ? subDays(new Date(), 30)
      : period === '90d' ? subMonths(new Date(), 3)
      : new Date(2020, 0, 1);
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
    const periodStart = period === '7d' ? subDays(new Date(), 7)
      : period === '30d' ? subDays(new Date(), 30)
      : period === '90d' ? subMonths(new Date(), 3)
      : new Date(2020, 0, 1);
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
      if (selectedDate === today) {
        await supabase.from('accounts').update({ current_balance: value }).eq('id', accountId);
      }
      setInputValues(prev => ({ ...prev, [accountId]: '' }));
      setInputDates(prev => ({ ...prev, [accountId]: '' }));
      setSavedId(accountId);
      setTimeout(() => setSavedId(null), 2000);
      router.refresh();
    } catch { toast.error('Error al guardar'); }
    finally { setSavingId(null); }
  };

  // --- Save contributed capital (aportación manual, no ligada a fecha de transferencia) ---
  const handleSaveContributed = async (accountId: string) => {
    const value = parseFloat(contribInputs[accountId]);
    if (isNaN(value) || value < 0) return;
    setSavingContribId(accountId);
    try {
      const { error } = await supabase.from('accounts').update({ contributed_capital: value }).eq('id', accountId);
      if (error) throw error;
      setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, contributed_capital: value } : a));
      setContribInputs(prev => ({ ...prev, [accountId]: '' }));
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
      <div className="min-h-screen bg-neutral-50 pb-32 md:pb-8">
        <div className="sticky top-0 z-20 bg-neutral-50/80 backdrop-blur-xl border-b border-neutral-100 px-5 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-neutral-100"><ArrowLeft className="w-5 h-5 text-neutral-700" /></Link>
            <h1 className="text-lg font-semibold text-neutral-900">Inversiones</h1>
            <div className="w-9" />
          </div>
        </div>
        <div className="flex flex-col items-center justify-center px-5 pt-20 text-center">
          <BarChart3 className="w-16 h-16 text-neutral-200 mb-4" />
          <h2 className="text-xl font-bold text-neutral-900 mb-2">Sin cuentas de inversión</h2>
          <p className="text-neutral-500 text-sm max-w-sm mb-6">Crea una cuenta con tipo "Inversión" para empezar.</p>
          <Link href="/dashboard/cuentas" className="px-5 py-2.5 bg-neutral-900 text-white rounded-xl text-sm font-semibold">Ir a Cuentas</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-32 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-neutral-50/80 backdrop-blur-xl border-b border-neutral-100 px-5 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-neutral-100"><ArrowLeft className="w-5 h-5 text-neutral-700" /></Link>
          <h1 className="text-lg font-semibold text-neutral-900">Inversiones</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 py-6 space-y-5">

        {/* Portfolio Total */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5">
          <p className="text-xs text-neutral-400 font-medium uppercase tracking-wide mb-1">Portfolio Total</p>
          <p className="text-4xl font-black tracking-tight text-neutral-900 font-mono">{fmt(totalValue)}</p>
          <div className="flex items-center gap-3 mt-2">
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${dailyChange >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {dailyChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {fmtShort(dailyChange)}
            </div>
            <span className={`text-xs font-semibold ${dailyChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {dailyChangePct >= 0 ? '+' : ''}{dailyChangePct.toFixed(2)}%
            </span>
            <span className="text-xs text-neutral-400">hoy</span>
          </div>
          {totalContributed > 0 && (
            <p className="text-[11px] text-neutral-400 mt-1.5">
              Aportado <span className="font-semibold text-neutral-600">{fmt(totalContributed)}</span> · Rendimiento real{' '}
              <span className={`font-semibold ${realGain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {fmtShort(realGain)} ({realGainPct >= 0 ? '+' : ''}{realGainPct.toFixed(2)}%)
              </span>
            </p>
          )}
        </div>

        {/* Comparison strip */}
        <div className="grid grid-cols-3 gap-2">
          {[{ label: 'Ayer', d: 1 }, { label: '7 días', d: 7 }, { label: '30 días', d: 30 }].map(({ label, d }) => {
            const prev = getTotalForDaysBack(d);
            const diff = totalValue - prev;
            const pct = prev > 0 ? (diff / prev) * 100 : 0;
            return (
              <div key={label} className="bg-white rounded-xl border border-neutral-100 p-3 text-center">
                <p className="text-[10px] text-neutral-400 font-medium uppercase">{label}</p>
                <p className={`text-base font-black font-mono ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtShort(diff)}</p>
                <p className={`text-[10px] font-semibold ${diff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{pct >= 0 ? '+' : ''}{pct.toFixed(2)}%</p>
              </div>
            );
          })}
        </div>

        {/* Input Cards */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-1">Registrar Valor</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {accounts.map(acc => {
              const latest = getLatestSnapshot(acc.id);
              const hasToday = latest?.snapshot_date === today;
              return (
                <div key={acc.id} className="bg-white rounded-2xl border border-neutral-100 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-bold text-white overflow-hidden shrink-0"
                      style={{ backgroundColor: acc.banks?.logo_url ? 'transparent' : (acc.banks?.color || '#6366f1') }}>
                      {acc.banks?.logo_url ? <img src={acc.banks.logo_url} alt="" className="w-full h-full object-contain" /> : acc.banks?.name?.substring(0, 2).toUpperCase() || '€'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 truncate">{acc.name}</p>
                      <p className="text-lg font-black text-neutral-900 font-mono">{fmt(latest?.value ?? acc.current_balance)}</p>
                    </div>
                    {hasToday && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">Hoy ✓</span>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="relative flex-1 min-w-[100px]">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300 text-sm font-bold">€</span>
                      <input type="number" step="0.01" placeholder={latest?.value?.toFixed(2) || '0.00'} value={inputValues[acc.id] || ''}
                        onChange={(e) => setInputValues(prev => ({ ...prev, [acc.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveValue(acc.id); }}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-8 pr-3 py-2.5 text-sm font-mono font-medium text-neutral-900 placeholder-neutral-300 focus:ring-2 focus:ring-neutral-200 focus:bg-white outline-none" />
                    </div>
                    <input type="date" value={inputDates[acc.id] || today}
                      onChange={(e) => setInputDates(prev => ({ ...prev, [acc.id]: e.target.value }))}
                      className="bg-neutral-50 border border-neutral-200 rounded-xl px-2 py-2.5 text-xs font-medium text-neutral-700 outline-none w-[120px] shrink-0" />
                    <button onClick={() => handleSaveValue(acc.id)} disabled={!inputValues[acc.id] || savingId === acc.id}
                      className="px-4 py-2.5 bg-neutral-900 text-white rounded-xl text-sm font-semibold disabled:bg-neutral-200 disabled:text-neutral-400 shrink-0">
                      {savingId === acc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : savedId === acc.id ? <Check className="w-4 h-4" /> : 'OK'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Configurar aportaciones: capital invertido manualmente por cuenta */}
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          <button
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-neutral-400" />
              <span className="text-sm font-semibold text-neutral-900">Configurar aportaciones</span>
              <span className="text-xs text-neutral-400">({fmt(totalContributed)})</span>
            </div>
            <ChevronRight className={`w-4 h-4 text-neutral-400 transition-transform ${isConfigOpen ? 'rotate-90' : ''}`} />
          </button>
          {isConfigOpen && (
            <div className="border-t border-neutral-100 divide-y divide-neutral-50">
              <p className="px-4 py-2.5 text-[11px] text-neutral-400">
                Indica cuánto dinero llevas metido en total en cada fondo (no el de hoy: el acumulado). Cuando aportes más, súmalo aquí manualmente el día que el dinero aparezca reflejado en el fondo.
              </p>
              {accounts.map(acc => {
                const accGain = (acc.current_balance ?? 0) - (acc.contributed_capital || 0);
                return (
                  <div key={acc.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-neutral-900 truncate">{acc.name}</p>
                      <p className="text-[11px] text-neutral-400">
                        Aportado {fmt(acc.contributed_capital || 0)}
                        {acc.contributed_capital > 0 && (
                          <span className={`ml-1.5 font-semibold ${accGain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            ({fmtShort(accGain)})
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="relative w-28 shrink-0">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-300 text-xs font-bold">€</span>
                      <input
                        type="number" step="0.01" placeholder={(acc.contributed_capital || 0).toFixed(2)}
                        value={contribInputs[acc.id] || ''}
                        onChange={(e) => setContribInputs(prev => ({ ...prev, [acc.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveContributed(acc.id); }}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-6 pr-2 py-1.5 text-xs font-mono font-medium text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-200"
                      />
                    </div>
                    <button
                      onClick={() => handleSaveContributed(acc.id)}
                      disabled={!contribInputs[acc.id] || savingContribId === acc.id}
                      className="p-1.5 bg-neutral-900 text-white rounded-lg disabled:bg-neutral-200 disabled:text-neutral-400 shrink-0"
                    >
                      {savingContribId === acc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Historial de registros (editable, por si un valor se introdujo mal) */}
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          <button
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-neutral-400" />
              <span className="text-sm font-semibold text-neutral-900">Historial de registros</span>
              <span className="text-xs text-neutral-400">({snapshots.length})</span>
            </div>
            <ChevronRight className={`w-4 h-4 text-neutral-400 transition-transform ${isHistoryOpen ? 'rotate-90' : ''}`} />
          </button>
          {isHistoryOpen && (
            <div className="border-t border-neutral-100 max-h-[320px] overflow-y-auto divide-y divide-neutral-50">
              {[...snapshots].sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date)).map(s => {
                const acc = accounts.find(a => a.id === s.account_id);
                const isEditing = editingSnapshot?.id === s.id;
                const isBusy = historyBusyId === s.id;
                return (
                  <div key={s.id} className="px-4 py-2.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-neutral-900 truncate">{acc?.name || 'Cuenta'}</p>
                      <p className="text-[11px] text-neutral-400">{format(parseISO(s.snapshot_date), 'd MMM yyyy', { locale: es })}</p>
                    </div>
                    {isEditing ? (
                      <>
                        <div className="relative w-28 shrink-0">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-300 text-xs font-bold">€</span>
                          <input
                            type="number" step="0.01" autoFocus value={editingSnapshot.value}
                            onChange={(e) => setEditingSnapshot({ id: s.id, value: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateSnapshot(s); }}
                            className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-6 pr-2 py-1.5 text-xs font-mono font-medium text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-200"
                          />
                        </div>
                        <button onClick={() => handleUpdateSnapshot(s)} disabled={isBusy} className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg shrink-0">
                          {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => setEditingSnapshot(null)} className="p-1.5 bg-neutral-100 text-neutral-500 hover:bg-neutral-200 rounded-lg shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-xs font-bold font-mono text-neutral-700 shrink-0">{fmt(s.value)}</span>
                        <button onClick={() => setEditingSnapshot({ id: s.id, value: s.value.toString() })} className="p-1.5 text-neutral-400 hover:bg-neutral-100 rounded-lg shrink-0">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteSnapshot(s)} disabled={isBusy} className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-lg shrink-0">
                          {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
              {snapshots.length === 0 && (
                <div className="px-4 py-6 text-center text-xs text-neutral-400">Sin registros todavía</div>
              )}
            </div>
          )}
        </div>

        {/* Tab toggle: Charts / Calendar */}
        <div className="flex bg-neutral-100 rounded-xl p-0.5">
          <button onClick={() => setActiveTab('charts')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'charts' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`}>Gráficos</button>
          <button onClick={() => setActiveTab('calendar')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'calendar' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`}>Calendario</button>
        </div>

        {activeTab === 'charts' && (
          <>
            {/* Period Selector */}
            <div className="flex items-center gap-2">
              {([['7d', '7D'], ['30d', '30D'], ['90d', '3M'], ['all', 'Todo']] as [Period, string][]).map(([key, label]) => (
                <button key={key} onClick={() => setPeriod(key)} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${period === key ? 'bg-neutral-900 text-white' : 'bg-white border border-neutral-200 text-neutral-500'}`}>{label}</button>
              ))}
            </div>

            {/* Daily Changes BarChart */}
            {dailyChangesData.length > 1 && (
              <div className="bg-white rounded-2xl border border-neutral-100 p-5">
                <h3 className="text-sm font-semibold text-neutral-900 mb-1">Ganancia / Pérdida Diaria</h3>
                <p className="text-xs text-neutral-400 mb-4">Diferencia vs. día anterior</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={dailyChangesData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a1a1aa' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#d4d4d8' }} />
                    <ReferenceLine y={0} stroke="#e4e4e7" />
                    <Tooltip
                      contentStyle={{ borderRadius: '10px', border: '1px solid #e4e4e7', fontSize: '11px' }}
                      formatter={(val: number | undefined) => [fmtShort(val ?? 0), 'Cambio']}
                    />
                    <Bar dataKey="change" radius={[3, 3, 0, 0]} maxBarSize={24}>
                      {dailyChangesData.map((entry, i) => (
                        <Cell key={i} fill={entry.change >= 0 ? '#10b981' : '#f43f5e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Portfolio Evolution */}
            {evolutionData.length > 1 && (
              <div className="bg-white rounded-2xl border border-neutral-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-neutral-900">Evolución del Portfolio</h3>
                  {accounts.length > 1 && (
                    <div className="flex bg-neutral-100 rounded-lg p-0.5">
                      <button onClick={() => setShowPerAccount(false)} className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${!showPerAccount ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`}>Total</button>
                      <button onClick={() => setShowPerAccount(true)} className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${showPerAccount ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`}>Por cuenta</button>
                    </div>
                  )}
                </div>
                {showPerAccount && accounts.length > 1 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={perAccountEvolutionData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a1a1aa' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#d4d4d8' }} />
                      <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e4e4e7', fontSize: '11px' }}
                        formatter={(val: number | undefined, name: string | undefined) => [`${(val ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}€`, accounts.find(a => a.id === name)?.name || name || '']} />
                      <Legend wrapperStyle={{ fontSize: '10px' }} formatter={(value: string) => accounts.find(a => a.id === value)?.name || value} />
                      {accounts.map((acc, i) => (
                        <Line key={acc.id} type="monotone" dataKey={acc.id} name={acc.id} stroke={ACCOUNT_COLORS[i % ACCOUNT_COLORS.length]} strokeWidth={2} dot={perAccountEvolutionData.length <= 10} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={evolutionData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradPort" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a1a1aa' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#d4d4d8' }}
                        domain={[(min: number) => Math.floor(min * 0.998), (max: number) => Math.ceil(max * 1.002)]} />
                      <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e4e4e7', fontSize: '11px' }}
                        formatter={(val: number | undefined) => [`${(val ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}€`, 'Portfolio']} />
                      <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#gradPort)" dot={evolutionData.length <= 10} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}

            {/* Per-account sparklines */}
            {accounts.length > 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {accounts.map(acc => {
                  const periodStart = period === '7d' ? subDays(new Date(), 7) : period === '30d' ? subDays(new Date(), 30) : period === '90d' ? subMonths(new Date(), 3) : new Date(2020, 0, 1);
                  const startStr = format(periodStart, 'yyyy-MM-dd');
                  const accData = snapshots.filter(s => s.account_id === acc.id && s.snapshot_date >= startStr)
                    .map(s => ({ label: format(parseISO(s.snapshot_date), 'd', { locale: es }), value: s.value }));
                  if (accData.length < 2) return null;
                  const change = accData[accData.length - 1].value - accData[0].value;
                  const isUp = change >= 0;
                  return (
                    <div key={acc.id} className="bg-white rounded-2xl border border-neutral-100 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-neutral-900 truncate">{acc.name}</p>
                        <span className={`text-xs font-bold ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtShort(change)}</span>
                      </div>
                      <ResponsiveContainer width="100%" height={60}>
                        <AreaChart data={accData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                          <defs><linearGradient id={`g-${acc.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={isUp ? '#10b981' : '#f43f5e'} stopOpacity={0.15} /><stop offset="95%" stopColor={isUp ? '#10b981' : '#f43f5e'} stopOpacity={0} /></linearGradient></defs>
                          <YAxis hide domain={[(min: number) => min * 0.998, (max: number) => max * 1.002]} />
                          <Area type="monotone" dataKey="value" stroke={isUp ? '#10b981' : '#f43f5e'} strokeWidth={1.5} fill={`url(#g-${acc.id})`} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
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
              <button onClick={() => setCalMonth(subMonths(calMonth, 1))} className="p-2 hover:bg-neutral-100 rounded-xl"><ChevronLeft className="w-5 h-5 text-neutral-600" /></button>
              <h2 className="text-base font-semibold text-neutral-900 capitalize">{format(calMonth, 'MMMM yyyy', { locale: es })}</h2>
              <button onClick={() => setCalMonth(addMonths(calMonth, 1))} className="p-2 hover:bg-neutral-100 rounded-xl"><ChevronRight className="w-5 h-5 text-neutral-600" /></button>
            </div>

            {/* Monthly summary */}
            {(() => {
              const monthGains = Object.entries(calendarGains).filter(([d]) => isSameMonth(parseISO(d), calMonth));
              const totalGain = monthGains.reduce((s, [, v]) => s + v, 0);
              const positiveDays = monthGains.filter(([, v]) => v > 0).length;
              const negativeDays = monthGains.filter(([, v]) => v < 0).length;
              return (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white rounded-xl border border-neutral-100 p-3 text-center">
                    <p className="text-[10px] text-neutral-400 font-medium uppercase">Balance mes</p>
                    <p className={`text-base font-black font-mono ${totalGain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtShort(totalGain)}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-3 text-center">
                    <p className="text-[10px] text-emerald-600 font-medium uppercase">Días en verde</p>
                    <p className="text-base font-black text-emerald-700">{positiveDays}</p>
                  </div>
                  <div className="bg-rose-50 rounded-xl border border-rose-100 p-3 text-center">
                    <p className="text-[10px] text-rose-600 font-medium uppercase">Días en rojo</p>
                    <p className="text-base font-black text-rose-700">{negativeDays}</p>
                  </div>
                </div>
              );
            })()}

            {/* Calendar grid */}
            <div className="bg-white rounded-2xl border border-neutral-100 p-4">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold text-neutral-400 uppercase py-1">{d}</div>
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
                      <span className="text-[10px] font-medium text-neutral-700">{format(day, 'd')}</span>
                      {hasData && (
                        <span className={`text-[7px] font-bold leading-none ${isPos ? 'text-emerald-700' : isNeg ? 'text-rose-700' : 'text-neutral-400'}`}>
                          {gain >= 0 ? '+' : ''}{gain.toFixed(0)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Daily breakdown list for the month */}
            <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-100">
                <p className="text-xs font-semibold text-neutral-900">Detalle diario</p>
              </div>
              <div className="max-h-[300px] overflow-y-auto divide-y divide-neutral-50">
                {Object.entries(calendarGains)
                  .filter(([d]) => isSameMonth(parseISO(d), calMonth))
                  .sort((a, b) => b[0].localeCompare(a[0]))
                  .map(([date, gain]) => (
                    <div key={date} className="px-4 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${gain >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        <span className="text-xs font-medium text-neutral-700">{format(parseISO(date), "EEEE d", { locale: es })}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-neutral-400 font-mono">{totalByDate[date]?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€</span>
                        <span className={`text-xs font-bold font-mono ${gain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtShort(gain)}</span>
                      </div>
                    </div>
                  ))}
                {Object.entries(calendarGains).filter(([d]) => isSameMonth(parseISO(d), calMonth)).length === 0 && (
                  <div className="px-4 py-8 text-center text-xs text-neutral-400">Sin datos este mes</div>
                )}
              </div>
            </div>
          </div>
        )}

        {snapshots.length === 0 && (
          <div className="text-center py-8 text-neutral-400 text-sm">
            Registra el valor de tus inversiones cada día para ver la evolución.
          </div>
        )}
      </div>
    </div>
  );
}
