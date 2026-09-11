'use client';

import { useState, useMemo, useEffect } from 'react';
import { useDashboard } from '@/lib/DashboardContext';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Target, Plus, AlertTriangle, TrendingUp, Pencil, Trash2,
  PiggyBank, ChevronRight, Shield, Check, Loader2
} from 'lucide-react';
import Link from 'next/link';
import CategoryIcon from '@/components/ui/CategoryIcon';
import BudgetFormModal from './BudgetFormModal';
import { getSpendingAnalysis } from '@/lib/actions/analysis';
import { upsertBudgetSettings } from '@/lib/actions/budgets';
import { toast } from 'sonner';

const fmt = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

export default function BudgetsPageClient() {
  const { transactions, categories, userId } = useDashboard();
  const router = useRouter();
  const supabase = createClient();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [settings, setSettings] = useState<{ monthly_income: number; cushion: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any>(null);
  const [predictionByCategory, setPredictionByCategory] = useState<Record<string, number>>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [incomeInput, setIncomeInput] = useState('');
  const [cushionInput, setCushionInput] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    const fetchBudgets = async () => {
      const [{ data: budgetsData }, { data: settingsData }] = await Promise.all([
        supabase.from('budgets').select('*').eq('user_id', userId),
        supabase.from('budget_settings').select('*').eq('user_id', userId).maybeSingle(),
      ]);
      setBudgets(budgetsData || []);
      setSettings(settingsData || { monthly_income: 0, cushion: 0 });
      setLoading(false);
    };
    fetchBudgets();

    getSpendingAnalysis().then(res => {
      if (res.data) {
        const map: Record<string, number> = {};
        res.data.categories.forEach((c: any) => { map[c.categoryId] = c.prediction; });
        setPredictionByCategory(map);
      }
    });
  }, [userId]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const categoriesMap = useMemo(() =>
    categories.reduce((acc: any, c) => ({ ...acc, [c.id]: c }), {}),
  [categories]);

  const spendingMap = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach(t => {
      // Los gastos siempre cuentan. Las transferencias solo cuentan si el usuario les puso
      // categoría explícitamente (ej. una aportación regular a otra cuenta categorizada como "Ahorro").
      const countsTowardBudget = t.type === 'expense' || t.type === 'transfer';
      if (countsTowardBudget && t.transaction_date >= startOfMonth && t.category_id) {
        map[t.category_id] = (map[t.category_id] || 0) + t.amount;
      }
    });
    return map;
  }, [transactions, startOfMonth]);

  const budgetData = useMemo(() => {
    return budgets
      .filter(b => categoriesMap[b.category_id])
      .map(b => {
        const spent = spendingMap[b.category_id] || 0;
        const percentage = b.amount > 0 ? (spent / b.amount) * 100 : 0;
        const remaining = b.amount - spent;
        const category = categoriesMap[b.category_id];
        const status = percentage > 100 ? 'exceeded' : percentage >= 80 ? 'warning' : 'safe';
        const prediction = predictionByCategory[b.category_id];

        return { ...b, spent, percentage, remaining, category, status, prediction };
      })
      .sort((a, b) => b.percentage - a.percentage);
  }, [budgets, spendingMap, categoriesMap, predictionByCategory]);

  const expenseBudgets = useMemo(() => budgetData.filter(b => !b.is_savings), [budgetData]);
  const savingsBudgets = useMemo(() => budgetData.filter(b => b.is_savings), [budgetData]);

  const totalBudget = expenseBudgets.reduce((acc, b) => acc + b.amount, 0);
  const totalSpent = expenseBudgets.reduce((acc, b) => acc + b.spent, 0);
  const totalSaved = savingsBudgets.reduce((acc, b) => acc + b.spent, 0);
  const globalProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // --- Ingreso mensual + colchón ---
  const income = settings?.monthly_income || 0;
  const cushion = settings?.cushion || 0;
  const totalOverage = expenseBudgets.reduce((acc, b) => acc + Math.max(0, b.spent - b.amount), 0);
  const cushionUsed = Math.min(totalOverage, cushion);
  const cushionOverflow = Math.max(0, totalOverage - cushion);
  const cushionExceeded = totalOverage > cushion;
  const cushionPct = cushion > 0 ? (cushionUsed / cushion) * 100 : (totalOverage > 0 ? 100 : 0);

  const incomeAllocated = totalSpent + totalSaved;
  const incomeFree = income - incomeAllocated;
  const pctSpentOfIncome = income > 0 ? (totalSpent / income) * 100 : 0;
  const pctSavedOfIncome = income > 0 ? (totalSaved / income) * 100 : 0;
  const pctFreeOfIncome = income > 0 ? Math.max(0, (incomeFree / income) * 100) : 0;
  const incomeOverflow = Math.max(0, incomeAllocated - income);

  const alerts = budgetData.filter(b => !b.is_savings && (b.status === 'warning' || b.status === 'exceeded'));

  const handleDelete = async (budgetId: string) => {
    if (!confirm('¿Eliminar este presupuesto?')) return;
    await supabase.from('budgets').delete().eq('id', budgetId);
    setBudgets(prev => prev.filter(b => b.id !== budgetId));
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingBudget(null);
    // Refresh budgets
    supabase.from('budgets').select('*').eq('user_id', userId).then(({ data }) => {
      if (data) setBudgets(data);
    });
  };

  const handleSaveSettings = async () => {
    const newIncome = incomeInput === '' ? income : parseFloat(incomeInput);
    const newCushion = cushionInput === '' ? cushion : parseFloat(cushionInput);
    if (isNaN(newIncome) || newIncome < 0 || isNaN(newCushion) || newCushion < 0) return;

    setSavingSettings(true);
    const res = await upsertBudgetSettings(newIncome, newCushion);
    setSavingSettings(false);

    if (res.success) {
      setSettings({ monthly_income: newIncome, cushion: newCushion });
      setIncomeInput('');
      setCushionInput('');
      toast.success('Configuración del mes guardada');
      router.refresh();
    } else {
      toast.error('Error al guardar: ' + res.error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-32 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-neutral-50/80 backdrop-blur-xl border-b border-neutral-100 px-5 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-neutral-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-neutral-700" />
          </Link>
          <h1 className="text-lg font-semibold text-neutral-900">Presupuestos</h1>
          <button
            onClick={() => { setEditingBudget(null); setIsModalOpen(true); }}
            className="p-2 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-6 space-y-5">

        {/* Configurar mes: ingreso + colchón */}
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-neutral-400" />
              <span className="text-sm font-semibold text-neutral-900">Configurar mes</span>
              <span className="text-xs text-neutral-400">(ingreso {fmt(income)} · colchón {fmt(cushion)})</span>
            </div>
            <ChevronRight className={`w-4 h-4 text-neutral-400 transition-transform ${isSettingsOpen ? 'rotate-90' : ''}`} />
          </button>
          {isSettingsOpen && (
            <div className="border-t border-neutral-100 p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">Ingreso mensual</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300 text-sm font-bold">€</span>
                    <input
                      type="number" step="0.01" placeholder={income.toFixed(2)}
                      value={incomeInput}
                      onChange={(e) => setIncomeInput(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-8 pr-3 py-2.5 text-sm font-mono font-medium text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-200 focus:bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">Colchón extra</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300 text-sm font-bold">€</span>
                    <input
                      type="number" step="0.01" placeholder={cushion.toFixed(2)}
                      value={cushionInput}
                      onChange={(e) => setCushionInput(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-8 pr-3 py-2.5 text-sm font-mono font-medium text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-200 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-neutral-400">
                El ingreso lo fijas tú a mano (nómina, etc.). El colchón es un extra compartido: si te pasas en alguna categoría de gasto, el exceso se descuenta de aquí antes de que salte la alerta grande.
              </p>
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings || (incomeInput === '' && cushionInput === '')}
                className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white py-2.5 rounded-xl text-sm font-semibold disabled:bg-neutral-200 disabled:text-neutral-400"
              >
                {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Guardar
              </button>
            </div>
          )}
        </div>

        {/* Banda de ingreso */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-neutral-400 font-medium uppercase tracking-wide">Ingreso del Mes</p>
            {income > 0 && (
              <span className={`text-xs font-bold ${incomeFree >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {incomeFree >= 0 ? `${fmt(incomeFree)} libre` : `${fmt(Math.abs(incomeFree))} de más`}
              </span>
            )}
          </div>
          <p className="text-3xl font-black tracking-tight text-neutral-900 font-mono mb-4">{fmt(income)}</p>

          {income > 0 ? (
            <>
              {/* Stacked band */}
              <div className="h-8 bg-neutral-100 rounded-xl overflow-hidden flex">
                {expenseBudgets.map(b => (
                  b.spent > 0 && (
                    <div
                      key={b.id}
                      style={{ width: `${(b.spent / income) * 100}%`, backgroundColor: b.category.color }}
                      className="h-full shrink-0 first:rounded-l-xl"
                      title={`${b.category.name}: ${fmt(b.spent)}`}
                    />
                  )
                ))}
                {savingsBudgets.map(b => (
                  b.spent > 0 && (
                    <div
                      key={b.id}
                      style={{ width: `${(b.spent / income) * 100}%`, backgroundColor: b.category.color, opacity: 0.55 }}
                      className="h-full shrink-0"
                      title={`${b.category.name} (ahorro): ${fmt(b.spent)}`}
                    />
                  )
                ))}
                {incomeFree > 0 && (
                  <div style={{ width: `${pctFreeOfIncome}%` }} className="h-full shrink-0 bg-neutral-100 last:rounded-r-xl" />
                )}
              </div>

              {incomeOverflow > 0 && (
                <p className="text-[11px] font-semibold text-rose-600 mt-1.5">
                  Te pasas del ingreso en {fmt(incomeOverflow)}
                </p>
              )}

              {/* Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                {[...expenseBudgets, ...savingsBudgets].filter(b => b.spent > 0).map(b => (
                  <div key={b.id} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: b.category.color, opacity: b.is_savings ? 0.55 : 1 }} />
                    <span className="text-[11px] font-medium text-neutral-600">{b.category.name}</span>
                    <span className="text-[11px] font-mono text-neutral-400">{income > 0 ? `${((b.spent / income) * 100).toFixed(0)}%` : ''}</span>
                  </div>
                ))}
              </div>

              {/* Summary numbers */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-neutral-100">
                <div className="text-center">
                  <p className="text-sm font-black font-mono text-neutral-900">{pctSpentOfIncome.toFixed(0)}%</p>
                  <p className="text-[10px] text-neutral-400 font-medium uppercase">Gastado</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-black font-mono text-emerald-600">{pctSavedOfIncome.toFixed(0)}%</p>
                  <p className="text-[10px] text-neutral-400 font-medium uppercase">Ahorrado</p>
                </div>
                <div className="text-center">
                  <p className={`text-sm font-black font-mono ${incomeFree >= 0 ? 'text-neutral-900' : 'text-rose-600'}`}>{pctFreeOfIncome.toFixed(0)}%</p>
                  <p className="text-[10px] text-neutral-400 font-medium uppercase">Libre</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-neutral-400">Fija tu ingreso mensual en "Configurar mes" para ver el desglose.</p>
          )}
        </div>

        {/* Colchón */}
        {cushion > 0 && (
          <div className={`rounded-2xl border p-4 ${cushionExceeded ? 'bg-rose-50 border-rose-100' : cushionUsed > 0 ? 'bg-amber-50 border-amber-100' : 'bg-white border-neutral-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Shield className={`w-4 h-4 ${cushionExceeded ? 'text-rose-500' : cushionUsed > 0 ? 'text-amber-500' : 'text-neutral-400'}`} />
                <span className="text-sm font-semibold text-neutral-900">Colchón</span>
              </div>
              <span className={`text-xs font-bold ${cushionExceeded ? 'text-rose-600' : cushionUsed > 0 ? 'text-amber-600' : 'text-neutral-500'}`}>
                {fmt(cushionUsed)} / {fmt(cushion)}
              </span>
            </div>
            <div className="h-2.5 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${cushionExceeded ? 'bg-rose-500' : cushionUsed > 0 ? 'bg-amber-400' : 'bg-neutral-200'}`}
                style={{ width: `${Math.min(cushionPct, 100)}%` }}
              />
            </div>
            {cushionExceeded && (
              <p className="text-xs font-semibold text-rose-600 mt-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Has agotado el colchón: {fmt(cushionOverflow)} sin cubrir este mes.
              </p>
            )}
          </div>
        )}

        {/* Global Progress Card */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-neutral-400 font-medium uppercase tracking-wide">Presupuesto de Gastos</p>
              <p className="text-3xl font-black tracking-tight text-neutral-900 font-mono">
                {(totalBudget - totalSpent).toLocaleString('es-ES', { minimumFractionDigits: 2 })}€
                <span className="text-sm font-medium text-neutral-400 ml-2">disponible</span>
              </p>
            </div>
            <div className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
              globalProgress > 100 ? 'bg-rose-50 text-rose-600' :
              globalProgress >= 80 ? 'bg-amber-50 text-amber-600' :
              'bg-emerald-50 text-emerald-600'
            }`}>
              {globalProgress.toFixed(0)}% usado
            </div>
          </div>
          <div className="h-2.5 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                globalProgress > 100 ? 'bg-rose-500' :
                globalProgress >= 80 ? 'bg-amber-400' :
                'bg-emerald-400'
              }`}
              style={{ width: `${Math.min(globalProgress, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-medium text-neutral-400">
            <span>Gastado: {totalSpent.toLocaleString('es-ES')}€</span>
            <span>Límite: {totalBudget.toLocaleString('es-ES')}€</span>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map(b => (
              <div key={`alert-${b.id}`} className={`rounded-xl p-3 flex items-center gap-3 border ${
                b.status === 'exceeded' ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100'
              }`}>
                <AlertTriangle className={`w-4 h-4 shrink-0 ${b.status === 'exceeded' ? 'text-rose-500' : 'text-amber-500'}`} />
                <p className={`text-xs font-medium flex-1 ${b.status === 'exceeded' ? 'text-rose-700' : 'text-amber-700'}`}>
                  <span className="font-bold">{b.category.name}</span>
                  {b.status === 'exceeded'
                    ? ` — excedido en ${Math.abs(b.remaining).toLocaleString('es-ES')}€${cushion > 0 ? (b.remaining < 0 && !cushionExceeded ? ' (cubierto por el colchón)' : '') : ''}`
                    : ` — al ${b.percentage.toFixed(0)}% del límite`
                  }
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Budget Cards */}
        {budgetData.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-neutral-200 p-12 text-center">
            <Target className="w-12 h-12 text-neutral-200 mx-auto mb-3" />
            <p className="text-neutral-500 font-medium mb-1">Sin presupuestos</p>
            <p className="text-sm text-neutral-400 mb-4">Crea uno para controlar tus gastos por categoría</p>
            <button
              onClick={() => { setEditingBudget(null); setIsModalOpen(true); }}
              className="px-5 py-2.5 bg-neutral-900 text-white rounded-xl text-sm font-semibold"
            >
              Crear Presupuesto
            </button>
          </div>
        ) : (
          <>
            {expenseBudgets.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-1">Gastos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {expenseBudgets.map(b => (
                    <BudgetCard key={b.id} b={b} onEdit={() => { setEditingBudget(b); setIsModalOpen(true); }} onDelete={() => handleDelete(b.id)} />
                  ))}
                </div>
              </div>
            )}

            {savingsBudgets.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
                  <PiggyBank className="w-3.5 h-3.5" /> Ahorro
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {savingsBudgets.map(b => (
                    <BudgetCard key={b.id} b={b} isSavings onEdit={() => { setEditingBudget(b); setIsModalOpen(true); }} onDelete={() => handleDelete(b.id)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <BudgetFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        categories={categories}
        existingBudget={editingBudget}
      />
    </div>
  );
}

function BudgetCard({ b, isSavings, onEdit, onDelete }: { b: any; isSavings?: boolean; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-4 group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${b.category.color}15` }}
          >
            <CategoryIcon name={b.category.icon} className="w-5 h-5" style={{ color: b.category.color }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-900">{b.category.name}</p>
            <p className="text-xs text-neutral-400 font-mono">
              {b.spent.toLocaleString('es-ES')}€ / {b.amount.toLocaleString('es-ES')}€
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-400">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-400">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isSavings ? 'bg-emerald-500' :
            b.status === 'exceeded' ? 'bg-rose-500' :
            b.status === 'warning' ? 'bg-amber-400' :
            'bg-emerald-400'
          }`}
          style={{ width: `${Math.min(b.percentage, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-bold ${
          isSavings ? 'text-emerald-500' :
          b.status === 'exceeded' ? 'text-rose-500' :
          b.status === 'warning' ? 'text-amber-500' :
          'text-emerald-500'
        }`}>
          {b.percentage.toFixed(0)}%
        </span>
        <span className="text-[10px] font-medium text-neutral-400">
          {isSavings
            ? (b.remaining >= 0 ? `${b.remaining.toLocaleString('es-ES')}€ para el objetivo` : `${Math.abs(b.remaining).toLocaleString('es-ES')}€ de más ahorrado`)
            : (b.remaining >= 0 ? `${b.remaining.toLocaleString('es-ES')}€ libre` : `${Math.abs(b.remaining).toLocaleString('es-ES')}€ excedido`)
          }
        </span>
      </div>

      {!isSavings && b.prediction > b.amount && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] font-medium text-violet-500 bg-violet-50 rounded-lg px-2 py-1.5">
          <TrendingUp className="w-3 h-3 shrink-0" />
          IA estima que gastarás ~{Math.round(b.prediction).toLocaleString('es-ES')}€ este mes, por encima del límite
        </div>
      )}
    </div>
  );
}
