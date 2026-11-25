'use client';

import { useEffect, useMemo, useState } from 'react';
import { Settings2, X, Eye, EyeOff, ArrowUp, ArrowDown } from 'lucide-react';
import { format, isSameMonth, parseISO } from 'date-fns';
import { useDashboard } from '@/lib/DashboardContext';
import NetWorthCard from './NetWorthCard';
import AccountList from './AccountList';
import RecentTransactionsList from './RecentTransactionsList';
import AlertsBell from './AlertsBell';
import MonthOverviewCard from './home/MonthOverviewCard';
import InsightsCard from './home/InsightsCard';
import BudgetRingsWidget from './home/BudgetRingsWidget';
import GoalsWidget from './home/GoalsWidget';
import WeekStripWidget from './home/WeekStripWidget';
import MonthRecapCard from './home/MonthRecapCard';
import { computeMonthRecap } from '@/lib/homeWidgets';
import { computeBudgetMonth } from '@/lib/budgetPlan';
import { useHomeData } from '@/lib/useHomeData';
import { computeInsights, computeMonthOverview, savingsCategoryIds, type HomeTx } from '@/lib/homeInsights';

type WidgetId =
  | 'monthRecap' | 'monthOverview' | 'insights' | 'netWorth' | 'recentTransactions'
  | 'budgets' | 'goals' | 'accounts' | 'upcomingSubscriptions';
type Column = 'main' | 'side';

type WidgetDef = {
  id: WidgetId;
  label: string;
  column: Column;
};

const WIDGET_DEFS: (WidgetDef & { defaultVisible?: boolean })[] = [
  { id: 'monthRecap', label: 'Resumen del mes anterior (días 1-5)', column: 'main' },
  { id: 'monthOverview', label: 'Disponible este mes', column: 'main' },
  { id: 'insights', label: 'Para ti hoy', column: 'main' },
  { id: 'recentTransactions', label: 'Transacciones recientes', column: 'main' },
  // El saldo total ya aparece en "Disponible este mes"; la tarjeta antigua queda como opcional.
  { id: 'netWorth', label: 'Balance total (clásico)', column: 'main', defaultVisible: false },
  { id: 'budgets', label: 'Presupuestos', column: 'side' },
  { id: 'goals', label: 'Tus objetivos', column: 'side' },
  { id: 'upcomingSubscriptions', label: 'Próximos 7 días', column: 'side' },
  { id: 'accounts', label: 'Cuentas', column: 'side' },
];

type LayoutEntry = { id: WidgetId; visible: boolean };

const DEFAULT_LAYOUT: LayoutEntry[] = WIDGET_DEFS.map(w => ({ id: w.id, visible: w.defaultVisible ?? true }));

const STORAGE_KEY = 'fintek_dashboard_layout_v2';
const LEGACY_STORAGE_KEY = 'fintek_dashboard_layout_v1';

function loadLayout(): LayoutEntry[] {
  if (typeof window === 'undefined') return DEFAULT_LAYOUT;
  try {
    let raw = window.localStorage.getItem(STORAGE_KEY);
    const isLegacy = !raw;
    if (!raw) raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    let merged: LayoutEntry[] = (JSON.parse(raw) as LayoutEntry[]).filter(s => WIDGET_DEFS.some(w => w.id === s.id));
    // v1 → v2: la tarjeta de saldo se sustituye por "Disponible este mes".
    if (isLegacy) merged = merged.map(e => (e.id === 'netWorth' ? { ...e, visible: false } : e));
    // Los widgets nuevos se insertan en su posición por defecto (no al final de la lista).
    WIDGET_DEFS.forEach((def, i) => {
      if (merged.some(e => e.id === def.id)) return;
      const entry = { id: def.id, visible: def.defaultVisible ?? true };
      const nextId = WIDGET_DEFS.slice(i + 1).find(d => merged.some(e => e.id === d.id))?.id;
      const at = nextId ? merged.findIndex(e => e.id === nextId) : merged.length;
      merged.splice(at, 0, entry);
    });
    return merged;
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export default function DashboardContent({ firstName }: { readonly firstName: string }) {
  const { accounts, transactions, categories, userId } = useDashboard();
  const homeData = useHomeData(userId);
  const [layout, setLayout] = useState<LayoutEntry[]>(DEFAULT_LAYOUT);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);

  useEffect(() => {
    setLayout(loadLayout());
  }, []);

  const persistLayout = (next: LayoutEntry[]) => {
    setLayout(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  };

  const toggleVisible = (id: WidgetId) => {
    persistLayout(layout.map(l => (l.id === id ? { ...l, visible: !l.visible } : l)));
  };

  const moveWithinColumn = (id: WidgetId, direction: -1 | 1) => {
    const def = WIDGET_DEFS.find(w => w.id === id);
    if (!def) return;
    const columnIds = layout.filter(l => WIDGET_DEFS.find(w => w.id === l.id)?.column === def.column).map(l => l.id);
    const idx = columnIds.indexOf(id);
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= columnIds.length) return;

    const next = [...layout];
    const globalIdx = next.findIndex(l => l.id === id);
    const globalTargetIdx = next.findIndex(l => l.id === columnIds[targetIdx]);
    [next[globalIdx], next[globalTargetIdx]] = [next[globalTargetIdx], next[globalIdx]];
    persistLayout(next);
  };

  const now = new Date();
  const monthKey = format(now, 'yyyy-MM');

  const { totalBalance, monthlyIncome, monthlyExpense, recentTransactions } = useMemo(() => {
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.current_balance, 0);

    // Mismo criterio que /movimientos (TransactionsView en modo "mes"): isSameMonth
    // acota al mes en curso completo (no solo desde el día 1 hacia adelante), para
    // que la cifra de Ingresos sea idéntica en ambas pantallas.
    const monthTx = transactions.filter(t => isSameMonth(parseISO(t.transaction_date), now));
    const monthlyIncome = monthTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpense = monthTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    const recentTransactions = transactions.slice(0, 5);
    return { totalBalance, monthlyIncome, monthlyExpense, recentTransactions };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, transactions, monthKey]);

  const homeTx = transactions as unknown as HomeTx[];
  const overview = useMemo(() => homeData && computeMonthOverview({
    now: new Date(),
    transactions: homeTx,
    prevMonthTransactions: homeData.prevMonthTransactions,
    subscriptions: homeData.subscriptions,
    monthlyIncomeSetting: homeData.monthlyIncomeSetting,
    savingsCategories: savingsCategoryIds(categories, homeData.budgets),
  }), [homeData, homeTx, categories]);
  // Con plan configurado, la tarjeta principal usa exactamente el cálculo de Presupuestos.
  const plan = useMemo(() => {
    if (!homeData?.planSettings || !(Number(homeData.planSettings.monthly_income) > 0)) return null;
    return computeBudgetMonth({
      now: new Date(),
      transactions: homeTx,
      budgets: homeData.budgets,
      categories,
      settings: homeData.planSettings,
      savingsCategories: savingsCategoryIds(categories, homeData.budgets),
    });
  }, [homeData, homeTx, categories]);
  const insights = useMemo(() => homeData && overview && computeInsights({
    now: new Date(),
    transactions: homeTx,
    prevMonthTransactions: homeData.prevMonthTransactions,
    categories,
    subscriptions: homeData.subscriptions,
    overview,
  }), [homeData, overview, homeTx, categories]);

  const recap = useMemo(
    () => homeData && computeMonthRecap([...homeData.prevMonthTransactions, ...homeTx]),
    [homeData, homeTx]
  );

  const renderWidget = (id: WidgetId) => {
    switch (id) {
      case 'monthRecap':
        return <MonthRecapCard recap={recap} categories={categories} />;
      case 'goals':
        return <GoalsWidget goals={homeData?.goals ?? null} />;
      case 'monthOverview':
        return <MonthOverviewCard overview={overview} plan={plan} totalBalance={totalBalance} />;
      case 'insights':
        return <InsightsCard insights={insights} />;
      case 'budgets':
        return <BudgetRingsWidget budgets={homeData?.budgets ?? null} categories={categories} transactions={homeTx} />;
      case 'netWorth':
        return <NetWorthCard totalBalance={totalBalance} monthlyIncome={monthlyIncome} monthlyExpense={monthlyExpense} />;
      case 'recentTransactions':
        return <RecentTransactionsList transactions={recentTransactions} />;
      case 'accounts':
        return <AccountList accounts={accounts as any} />;
      case 'upcomingSubscriptions':
        return <WeekStripWidget subscriptions={homeData?.subscriptions ?? null} />;
      default:
        return null;
    }
  };

  const mainWidgets = layout.filter(l => l.visible && WIDGET_DEFS.find(w => w.id === l.id)?.column === 'main');
  const sideWidgets = layout.filter(l => l.visible && WIDGET_DEFS.find(w => w.id === l.id)?.column === 'side');

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-8">
      <div className="px-5 pt-8 pb-6 md:max-w-6xl md:mx-auto flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground tracking-tight leading-none">
          Hola, {firstName}
        </h1>
        <div className="flex items-center gap-2">
          <AlertsBell />
          <button
            onClick={() => setIsCustomizeOpen(true)}
            className="p-2.5 rounded-xl bg-card border border-border text-muted-foreground hover:bg-muted transition-colors"
            title="Personalizar inicio"
          >
            <Settings2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-5 md:max-w-6xl md:mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-8 space-y-5">
            {mainWidgets.map(w => <div key={w.id} className="empty:hidden">{renderWidget(w.id)}</div>)}
          </div>

          <div className="md:col-span-4 space-y-5">
            {sideWidgets.map(w => <div key={w.id} className="empty:hidden">{renderWidget(w.id)}</div>)}
          </div>
        </div>
      </div>

      {isCustomizeOpen && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-end sm:items-center justify-center animate-fade-in">
          <div className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-hidden animate-slide-up">
            <div className="px-4 py-3 flex items-center justify-between border-b border-border">
              <button onClick={() => setIsCustomizeOpen(false)} className="p-2 rounded-full hover:bg-muted transition-colors">
                <X className="w-5 h-5 text-foreground" />
              </button>
              <h2 className="text-base font-bold text-foreground">Personalizar inicio</h2>
              <div className="w-9" />
            </div>

            <div className="overflow-y-auto max-h-[65vh] p-4 space-y-5">
              {(['main', 'side'] as Column[]).map(column => (
                <div key={column} className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
                    {column === 'main' ? 'Columna principal' : 'Columna lateral'}
                  </p>
                  {layout
                    .filter(l => WIDGET_DEFS.find(w => w.id === l.id)?.column === column)
                    .map((entry, idx, arr) => {
                      const def = WIDGET_DEFS.find(w => w.id === entry.id)!;
                      return (
                        <div key={entry.id} className="flex items-center gap-2 bg-muted/60 border border-border rounded-xl px-3 py-2.5">
                          <span className={`flex-1 text-sm font-semibold ${entry.visible ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {def.label}
                          </span>
                          <button
                            onClick={() => moveWithinColumn(entry.id, -1)}
                            disabled={idx === 0}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => moveWithinColumn(entry.id, 1)}
                            disabled={idx === arr.length - 1}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleVisible(entry.id)}
                            className={`p-1.5 rounded-lg transition-colors ${entry.visible ? 'text-muted-foreground hover:bg-muted' : 'text-muted-foreground hover:bg-muted'}`}
                          >
                            {entry.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-border bg-card pb-6">
              <button
                onClick={() => setIsCustomizeOpen(false)}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-3 rounded-xl font-bold text-sm transition-all"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
