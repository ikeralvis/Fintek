'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, TrendingUp, TrendingDown, Check, Loader2,
  ChevronRight, BarChart3
} from 'lucide-react';
import { format, parseISO, subDays, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

type Account = {
  id: string;
  name: string;
  current_balance: number;
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

export default function InvestmentsView({ accounts, snapshots: initialSnapshots, userId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [snapshots, setSnapshots] = useState(initialSnapshots);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('30d');

  const today = format(new Date(), 'yyyy-MM-dd');

  const getLatestSnapshot = (accountId: string): Snapshot | undefined => {
    const accountSnapshots = snapshots.filter(s => s.account_id === accountId);
    return accountSnapshots[accountSnapshots.length - 1];
  };

  const getPreviousSnapshot = (accountId: string, daysBack: number): Snapshot | undefined => {
    const targetDate = format(subDays(new Date(), daysBack), 'yyyy-MM-dd');
    const accountSnapshots = snapshots.filter(s => s.account_id === accountId);
    let closest: Snapshot | undefined;
    for (const s of accountSnapshots) {
      if (s.snapshot_date <= targetDate) closest = s;
    }
    return closest;
  };

  const handleSaveValue = async (accountId: string) => {
    const value = parseFloat(inputValues[accountId]);
    if (isNaN(value) || value <= 0) return;

    setSavingId(accountId);
    try {
      const { data, error } = await supabase
        .from('investment_snapshots')
        .upsert(
          { user_id: userId, account_id: accountId, value, snapshot_date: today },
          { onConflict: 'account_id,snapshot_date' }
        )
        .select()
        .single();

      if (error) throw error;

      setSnapshots(prev => {
        const filtered = prev.filter(s => !(s.account_id === accountId && s.snapshot_date === today));
        return [...filtered, data].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
      });

      // Also update account balance
      await supabase.from('accounts').update({ current_balance: value }).eq('id', accountId);

      setInputValues(prev => ({ ...prev, [accountId]: '' }));
      setSavedId(accountId);
      setTimeout(() => setSavedId(null), 2000);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Error al guardar');
    } finally {
      setSavingId(null);
    }
  };

  // Total portfolio value
  const totalValue = useMemo(() => {
    let total = 0;
    for (const acc of accounts) {
      const latest = getLatestSnapshot(acc.id);
      total += latest?.value ?? acc.current_balance;
    }
    return total;
  }, [accounts, snapshots]);

  // Total yesterday
  const totalYesterday = useMemo(() => {
    let total = 0;
    for (const acc of accounts) {
      const prev = getPreviousSnapshot(acc.id, 1);
      if (prev) total += prev.value;
      else total += acc.current_balance;
    }
    return total;
  }, [accounts, snapshots]);

  const dailyChange = totalValue - totalYesterday;
  const dailyChangePct = totalYesterday > 0 ? (dailyChange / totalYesterday) * 100 : 0;

  // Chart data
  const chartData = useMemo(() => {
    const periodStart = period === '7d' ? subDays(new Date(), 7)
      : period === '30d' ? subDays(new Date(), 30)
      : period === '90d' ? subMonths(new Date(), 3)
      : new Date(2020, 0, 1);

    const startStr = format(periodStart, 'yyyy-MM-dd');

    const dateMap: Record<string, number> = {};
    const filteredSnapshots = snapshots.filter(s => s.snapshot_date >= startStr);

    for (const s of filteredSnapshots) {
      if (!dateMap[s.snapshot_date]) dateMap[s.snapshot_date] = 0;
      dateMap[s.snapshot_date] += s.value;
    }

    return Object.entries(dateMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => ({
        date,
        label: format(parseISO(date), 'd MMM', { locale: es }),
        value,
      }));
  }, [snapshots, period]);

  // Per-account chart data
  const getAccountChartData = (accountId: string) => {
    const periodStart = period === '7d' ? subDays(new Date(), 7)
      : period === '30d' ? subDays(new Date(), 30)
      : period === '90d' ? subMonths(new Date(), 3)
      : new Date(2020, 0, 1);

    const startStr = format(periodStart, 'yyyy-MM-dd');

    return snapshots
      .filter(s => s.account_id === accountId && s.snapshot_date >= startStr)
      .map(s => ({
        date: s.snapshot_date,
        label: format(parseISO(s.snapshot_date), 'd MMM', { locale: es }),
        value: s.value,
      }));
  };

  const formatCurrency = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

  if (accounts.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50 pb-32 md:pb-8">
        <div className="sticky top-0 z-20 bg-neutral-50/80 backdrop-blur-xl border-b border-neutral-100 px-5 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-neutral-100 transition-colors">
              <ArrowLeft className="w-5 h-5 text-neutral-700" />
            </Link>
            <h1 className="text-lg font-semibold text-neutral-900">Inversiones</h1>
            <div className="w-9" />
          </div>
        </div>
        <div className="flex flex-col items-center justify-center px-5 pt-20 text-center">
          <BarChart3 className="w-16 h-16 text-neutral-200 mb-4" />
          <h2 className="text-xl font-bold text-neutral-900 mb-2">Sin cuentas de inversión</h2>
          <p className="text-neutral-500 text-sm max-w-sm mb-6">
            Crea una cuenta con tipo "Inversión" en Configuración para empezar a trackear tu portfolio.
          </p>
          <Link href="/dashboard/cuentas" className="px-5 py-2.5 bg-neutral-900 text-white rounded-xl text-sm font-semibold">
            Ir a Cuentas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-32 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-neutral-50/80 backdrop-blur-xl border-b border-neutral-100 px-5 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-neutral-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-neutral-700" />
          </Link>
          <h1 className="text-lg font-semibold text-neutral-900">Inversiones</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 py-6 space-y-6">

        {/* Total Portfolio Card */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-6">
          <p className="text-xs text-neutral-400 font-medium uppercase tracking-wide mb-1">Portfolio Total</p>
          <p className="text-4xl font-black tracking-tight text-neutral-900 font-mono">{formatCurrency(totalValue)}</p>
          <div className="flex items-center gap-3 mt-3">
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
              dailyChange >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}>
              {dailyChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {dailyChange >= 0 ? '+' : ''}{formatCurrency(dailyChange)}
            </div>
            <span className={`text-xs font-semibold ${dailyChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {dailyChange >= 0 ? '+' : ''}{dailyChangePct.toFixed(2)}%
            </span>
            <span className="text-xs text-neutral-400">vs. ayer</span>
          </div>
        </div>

        {/* Input Cards - Register today's value */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-1">Registrar Valor de Hoy</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {accounts.map(acc => {
              const latest = getLatestSnapshot(acc.id);
              const hasToday = latest?.snapshot_date === today;
              const prevDay = getPreviousSnapshot(acc.id, 1);
              const diff = latest && prevDay ? latest.value - prevDay.value : 0;
              const diffPct = prevDay && prevDay.value > 0 ? (diff / prevDay.value) * 100 : 0;

              return (
                <div key={acc.id} className="bg-white rounded-2xl border border-neutral-100 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-bold text-white overflow-hidden shrink-0"
                      style={{ backgroundColor: acc.banks?.logo_url ? 'transparent' : (acc.banks?.color || '#6366f1') }}
                    >
                      {acc.banks?.logo_url ? (
                        <img src={acc.banks.logo_url} alt="" className="w-full h-full object-contain" />
                      ) : (
                        acc.banks?.name?.substring(0, 2).toUpperCase() || '€'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 truncate">{acc.name}</p>
                      <p className="text-xs text-neutral-400">{acc.banks?.name || 'Inversión'}</p>
                    </div>
                    {hasToday && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Hoy ✓</span>
                    )}
                  </div>

                  {/* Current value */}
                  <div className="flex items-baseline justify-between mb-3">
                    <p className="text-2xl font-black text-neutral-900 font-mono tracking-tight">
                      {formatCurrency(latest?.value ?? acc.current_balance)}
                    </p>
                    {diff !== 0 && (
                      <span className={`text-xs font-bold ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {diff >= 0 ? '+' : ''}{diff.toFixed(2)}€ ({diffPct >= 0 ? '+' : ''}{diffPct.toFixed(2)}%)
                      </span>
                    )}
                  </div>

                  {/* Quick input */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300 text-sm font-bold">€</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder={latest?.value?.toFixed(2) || '0.00'}
                        value={inputValues[acc.id] || ''}
                        onChange={(e) => setInputValues(prev => ({ ...prev, [acc.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveValue(acc.id); }}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-8 pr-3 py-2.5 text-sm font-mono font-medium text-neutral-900 placeholder-neutral-300 focus:ring-2 focus:ring-neutral-200 focus:bg-white outline-none transition-all"
                      />
                    </div>
                    <button
                      onClick={() => handleSaveValue(acc.id)}
                      disabled={!inputValues[acc.id] || savingId === acc.id}
                      className="px-4 py-2.5 bg-neutral-900 text-white rounded-xl text-sm font-semibold disabled:bg-neutral-200 disabled:text-neutral-400 transition-colors shrink-0 flex items-center gap-1.5"
                    >
                      {savingId === acc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : savedId === acc.id ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        'Guardar'
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2">
          {([['7d', '7D'], ['30d', '30D'], ['90d', '3M'], ['all', 'Todo']] as [Period, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === key ? 'bg-neutral-900 text-white' : 'bg-white border border-neutral-200 text-neutral-500 hover:border-neutral-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Total Portfolio Chart */}
        {chartData.length > 1 && (
          <div className="bg-white rounded-2xl border border-neutral-100 p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4">Evolución Total</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradPortfolio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#d4d4d8' }} domain={['dataMin - 50', 'dataMax + 50']} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', fontSize: '12px' }}
                  formatter={(val: number | undefined) => [`${(val ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}€`, 'Portfolio']}
                />
                <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#gradPortfolio)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Per-account charts */}
        {accounts.length > 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {accounts.map(acc => {
              const accData = getAccountChartData(acc.id);
              if (accData.length < 2) return null;

              const firstVal = accData[0].value;
              const lastVal = accData[accData.length - 1].value;
              const change = lastVal - firstVal;
              const isUp = change >= 0;

              return (
                <div key={acc.id} className="bg-white rounded-2xl border border-neutral-100 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-neutral-900">{acc.name}</h3>
                    <span className={`text-xs font-bold ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isUp ? '+' : ''}{change.toFixed(2)}€
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={120}>
                    <AreaChart data={accData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`grad-${acc.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={isUp ? '#10b981' : '#f43f5e'} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={isUp ? '#10b981' : '#f43f5e'} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a1a1aa' }} />
                      <YAxis hide domain={['dataMin - 20', 'dataMax + 20']} />
                      <Tooltip
                        contentStyle={{ borderRadius: '10px', border: '1px solid #e4e4e7', fontSize: '11px' }}
                        formatter={(val: number | undefined) => [`${(val ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}€`, '']}
                      />
                      <Area type="monotone" dataKey="value" stroke={isUp ? '#10b981' : '#f43f5e'} strokeWidth={1.5} fill={`url(#grad-${acc.id})`} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>
        )}

        {/* Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: 'vs. Ayer', days: 1 },
            { label: 'vs. Semana', days: 7 },
            { label: 'vs. Mes', days: 30 },
          ].map(({ label, days }) => {
            let prevTotal = 0;
            for (const acc of accounts) {
              const prev = getPreviousSnapshot(acc.id, days);
              if (prev) prevTotal += prev.value;
              else prevTotal += acc.current_balance;
            }
            const diff = totalValue - prevTotal;
            const pct = prevTotal > 0 ? (diff / prevTotal) * 100 : 0;
            const hasData = snapshots.length > 0;

            return (
              <div key={label} className="bg-white rounded-2xl border border-neutral-100 p-4">
                <p className="text-xs text-neutral-400 font-medium uppercase tracking-wide mb-2">{label}</p>
                {hasData ? (
                  <>
                    <p className={`text-xl font-black font-mono tracking-tight ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                    </p>
                    <p className={`text-xs font-semibold mt-1 ${diff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-neutral-300">Sin datos</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Info text */}
        {snapshots.length === 0 && (
          <div className="text-center py-8 text-neutral-400 text-sm">
            Registra el valor de tus inversiones cada día para ver la evolución aquí.
          </div>
        )}
      </div>
    </div>
  );
}
