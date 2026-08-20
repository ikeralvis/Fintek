'use client';

import { useEffect, useMemo, useState } from 'react';
import { Settings2, X, Eye, EyeOff, ArrowUp, ArrowDown } from 'lucide-react';
import { useDashboard } from '@/lib/DashboardContext';
import NetWorthCard from './NetWorthCard';
import QuickActions from './QuickActions';
import AccountList from './AccountList';
import RecentTransactionsList from './RecentTransactionsList';
import WalletWidget from './WalletWidget';

type WidgetId = 'netWorth' | 'quickActions' | 'recentTransactions' | 'accounts' | 'wallet';
type Column = 'main' | 'side';

type WidgetDef = {
  id: WidgetId;
  label: string;
  column: Column;
};

const WIDGET_DEFS: WidgetDef[] = [
  { id: 'netWorth', label: 'Resumen de saldo', column: 'main' },
  { id: 'quickActions', label: 'Accesos rápidos', column: 'main' },
  { id: 'recentTransactions', label: 'Transacciones recientes', column: 'main' },
  { id: 'accounts', label: 'Cuentas', column: 'side' },
  { id: 'wallet', label: 'Mi Cartera', column: 'side' },
];

type LayoutEntry = { id: WidgetId; visible: boolean };

const DEFAULT_LAYOUT: LayoutEntry[] = WIDGET_DEFS.map(w => ({ id: w.id, visible: true }));

const STORAGE_KEY = 'fintek_dashboard_layout_v1';

function loadLayout(): LayoutEntry[] {
  if (typeof window === 'undefined') return DEFAULT_LAYOUT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const saved: LayoutEntry[] = JSON.parse(raw);
    // Merge with defaults so newly-added widgets still show up
    const savedIds = new Set(saved.map(s => s.id));
    const merged = [...saved.filter(s => WIDGET_DEFS.some(w => w.id === s.id))];
    for (const def of WIDGET_DEFS) {
      if (!savedIds.has(def.id)) merged.push({ id: def.id, visible: true });
    }
    return merged;
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export default function DashboardContent({ firstName }: { readonly firstName: string }) {
  const { accounts, transactions } = useDashboard();
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
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const { totalBalance, monthlyIncome, monthlyExpense, recentTransactions, walletAccount, bankAccounts } = useMemo(() => {
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.current_balance, 0);

    const monthTx = transactions.filter(t => t.transaction_date >= firstDayOfMonth);
    const monthlyIncome = monthTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpense = monthTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    const recentTransactions = transactions.slice(0, 5);
    const walletAccount = accounts.find(a => a.type === 'wallet');
    const bankAccounts = accounts.filter(a => a.type !== 'wallet');

    return { totalBalance, monthlyIncome, monthlyExpense, recentTransactions, walletAccount, bankAccounts };
  }, [accounts, transactions, firstDayOfMonth]);

  const renderWidget = (id: WidgetId) => {
    switch (id) {
      case 'netWorth':
        return <NetWorthCard totalBalance={totalBalance} monthlyIncome={monthlyIncome} monthlyExpense={monthlyExpense} />;
      case 'quickActions':
        return <QuickActions />;
      case 'recentTransactions':
        return <RecentTransactionsList transactions={recentTransactions} />;
      case 'accounts':
        return <AccountList accounts={bankAccounts as any} />;
      case 'wallet':
        return walletAccount ? (
          <div>
            <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">Mi Cartera</h3>
            <WalletWidget walletAccount={walletAccount} />
          </div>
        ) : null;
      default:
        return null;
    }
  };

  const mainWidgets = layout.filter(l => l.visible && WIDGET_DEFS.find(w => w.id === l.id)?.column === 'main');
  const sideWidgets = layout.filter(l => l.visible && WIDGET_DEFS.find(w => w.id === l.id)?.column === 'side');

  return (
    <div className="min-h-screen bg-neutral-50 pb-32 md:pb-8">
      <div className="px-5 pt-8 pb-6 md:max-w-6xl md:mx-auto flex items-start justify-between">
        <div>
          <p className="text-sm text-neutral-400 font-medium">Hola,</p>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{firstName}</h1>
        </div>
        <button
          onClick={() => setIsCustomizeOpen(true)}
          className="p-2.5 rounded-xl bg-white border border-neutral-100 text-neutral-500 hover:bg-neutral-100 transition-colors"
          title="Personalizar inicio"
        >
          <Settings2 className="w-5 h-5" />
        </button>
      </div>

      <div className="px-5 md:max-w-6xl md:mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-8 space-y-5">
            {mainWidgets.map(w => <div key={w.id}>{renderWidget(w.id)}</div>)}
          </div>

          <div className="md:col-span-4 space-y-5">
            {sideWidgets.map(w => <div key={w.id}>{renderWidget(w.id)}</div>)}
          </div>
        </div>
      </div>

      {isCustomizeOpen && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-end sm:items-center justify-center animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-hidden animate-slide-up">
            <div className="px-4 py-3 flex items-center justify-between border-b border-neutral-100">
              <button onClick={() => setIsCustomizeOpen(false)} className="p-2 rounded-full hover:bg-neutral-100 transition-colors">
                <X className="w-5 h-5 text-neutral-900" />
              </button>
              <h2 className="text-base font-bold text-neutral-900">Personalizar inicio</h2>
              <div className="w-9" />
            </div>

            <div className="overflow-y-auto max-h-[65vh] p-4 space-y-5">
              {(['main', 'side'] as Column[]).map(column => (
                <div key={column} className="space-y-2">
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-1">
                    {column === 'main' ? 'Columna principal' : 'Columna lateral'}
                  </p>
                  {layout
                    .filter(l => WIDGET_DEFS.find(w => w.id === l.id)?.column === column)
                    .map((entry, idx, arr) => {
                      const def = WIDGET_DEFS.find(w => w.id === entry.id)!;
                      return (
                        <div key={entry.id} className="flex items-center gap-2 bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2.5">
                          <span className={`flex-1 text-sm font-semibold ${entry.visible ? 'text-neutral-900' : 'text-neutral-400'}`}>
                            {def.label}
                          </span>
                          <button
                            onClick={() => moveWithinColumn(entry.id, -1)}
                            disabled={idx === 0}
                            className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => moveWithinColumn(entry.id, 1)}
                            disabled={idx === arr.length - 1}
                            className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleVisible(entry.id)}
                            className={`p-1.5 rounded-lg transition-colors ${entry.visible ? 'text-neutral-600 hover:bg-neutral-200' : 'text-neutral-300 hover:bg-neutral-200'}`}
                          >
                            {entry.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-neutral-100 bg-white pb-6">
              <button
                onClick={() => setIsCustomizeOpen(false)}
                className="w-full bg-neutral-900 text-white hover:bg-neutral-800 py-3 rounded-xl font-bold text-sm transition-all"
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
