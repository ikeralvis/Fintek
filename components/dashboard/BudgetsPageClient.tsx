'use client';

import { useState, useMemo, useEffect } from 'react';
import { useDashboard } from '@/lib/DashboardContext';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Target, Plus, AlertTriangle, Pencil, Trash2,
  PiggyBank, Settings, Shield
} from 'lucide-react';
import Link from 'next/link';
import CategoryIcon from '@/components/ui/CategoryIcon';
import BudgetFormModal from './BudgetFormModal';
import BudgetSettingsModal from './BudgetSettingsModal';
import { Skeleton } from '@/components/ui/skeleton';
import { getSpendingAnalysis } from '@/lib/actions/analysis';
import { formatCurrency as fmt, cn } from '@/lib/utils';

export default function BudgetsPageClient() {
  const { transactions, categories, userId } = useDashboard();
  const router = useRouter();
  const supabase = createClient();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [settings, setSettings] = useState<{ monthly_income: number; cushion: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any>(null);
  const [averageByCategory, setAverageByCategory] = useState<Record<string, number>>({});
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

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
        const averageMap: Record<string, number> = {};
        res.data.categories.forEach((c: any) => {
          averageMap[c.categoryId] = c.average;
        });
        setAverageByCategory(averageMap);
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

        return { ...b, spent, percentage, remaining, category, status };
      })
      .sort((a, b) => b.percentage - a.percentage);
  }, [budgets, spendingMap, categoriesMap]);

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

  // Bolsa de dinero no comprometido (ingreso menos presupuestos, ahorro y colchón) que absorbe
  // en silencio los excesos pequeños antes de que lleguen a tocar el Colchón de Seguridad.
  // Deliberadamente no se muestra en la UI: es un cálculo interno, no una métrica más.
  const dineroLibre = Math.max(0, income - totalBudget - totalSaved - cushion);
  const overageAfterFree = Math.max(0, totalOverage - dineroLibre);

  // El Margen/Colchón solo mide una cosa: cuánto de ese resto (tras la bolsa libre) consume
  // el colchón, y si llega a agotarlo.
  const cushionUsed = Math.min(overageAfterFree, cushion);
  const cushionOverflow = Math.max(0, overageAfterFree - cushion);
  const cushionExceeded = overageAfterFree > cushion;
  const cushionPct = cushion > 0 ? (cushionUsed / cushion) * 100 : (overageAfterFree > 0 ? 100 : 0);
  const bufferCoversOverage = overageAfterFree > 0 && !cushionExceeded;

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

  const handleSettingsSaved = (newIncome: number, newCushion: number) => {
    setSettings({ monthly_income: newIncome, cushion: newCushion });
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-32 md:pb-8">
        <div className="sticky top-0 z-20 glass-nav border-b px-5 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-5 w-28" />
            <div className="flex items-center gap-1">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="h-9 w-9 rounded-xl" />
            </div>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-5 py-6 space-y-5">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 glass-nav border-b px-5 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground">Presupuestos</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2 text-muted-foreground hover:bg-muted rounded-xl transition-colors"
              title="Configurar mes"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => { setEditingBudget(null); setIsModalOpen(true); }}
              className="p-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
              title="Nuevo presupuesto"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-6 space-y-5">

        {/* Hero: patrimonio libre del mes */}
        <div className="bg-card rounded-2xl border border-border p-6 text-center">
          {income > 0 ? (
            <>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                {incomeFree >= 0 ? 'Disponible' : 'Sobregiro'}
              </p>
              <p className={cn(
                'text-4xl font-black tracking-tight tabular-nums mb-1',
                incomeFree >= 0 ? 'text-foreground' : 'text-accent-600 dark:text-accent-400'
              )}>
                {fmt(Math.abs(incomeFree))}
              </p>
              <p className="text-xs text-muted-foreground mb-5">de {fmt(income)} de ingreso este mes</p>

              {/* Barra de 3 bloques: Gastado / Ahorrado / Libre */}
              <div className="h-8 bg-muted rounded-xl overflow-hidden flex">
                {pctSpentOfIncome > 0 && (
                  <div
                    style={{ width: `${Math.min(pctSpentOfIncome, 100)}%` }}
                    className={cn('h-full shrink-0', incomeOverflow > 0 ? 'bg-accent-500' : 'bg-foreground/70')}
                    title={`Gastado: ${fmt(totalSpent)}`}
                  />
                )}
                {pctSavedOfIncome > 0 && (
                  <div
                    style={{ width: `${Math.min(pctSavedOfIncome, Math.max(0, 100 - pctSpentOfIncome))}%` }}
                    className="h-full shrink-0 bg-secondary-500"
                    title={`Ahorrado: ${fmt(totalSaved)}`}
                  />
                )}
              </div>

              {incomeOverflow > 0 && (
                <p className="text-[11px] font-semibold text-accent-600 dark:text-accent-400 mt-1.5">
                  Te pasas del ingreso en {fmt(incomeOverflow)}
                </p>
              )}

              {/* Summary numbers */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border">
                <div className="text-center">
                  <p className="text-sm font-black tabular-nums text-foreground">{pctSpentOfIncome.toFixed(0)}%</p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase">Gastado</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-black tabular-nums text-secondary-600 dark:text-secondary-400">{pctSavedOfIncome.toFixed(0)}%</p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase">Ahorrado</p>
                </div>
                <div className={cn('text-center', incomeFree < 0 && 'text-accent-600 dark:text-accent-400')}>
                  <p className="text-sm font-black tabular-nums">{pctFreeOfIncome.toFixed(0)}%</p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase">Libre</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <Target className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">Fija tu ingreso mensual para ver cuánto te queda libre</p>
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold"
              >
                Configurar mes
              </button>
            </>
          )}
        </div>

        {/* Margen de seguridad: solo mide cuánto del exceso de gasto consume el colchón */}
        {cushion > 0 && (
          <div className={`rounded-2xl border p-4 ${cushionExceeded ? 'bg-accent-500/10 border-accent-500/20' : bufferCoversOverage ? 'bg-amber-500/10 border-amber-500/20' : 'bg-card border-border'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Shield className={`w-4 h-4 ${cushionExceeded ? 'text-accent-500 dark:text-accent-400' : bufferCoversOverage ? 'text-amber-500 dark:text-amber-400' : 'text-muted-foreground'}`} />
                <span className="text-sm font-semibold text-foreground">Margen de seguridad</span>
              </div>
              <span className="text-xs font-bold tabular-nums text-foreground">{fmt(cushionUsed)} / {fmt(cushion)}</span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${cushionExceeded ? 'bg-accent-500' : 'bg-amber-400'}`}
                style={{ width: `${Math.min(cushionPct, 100)}%` }}
              />
            </div>
            {bufferCoversOverage && (
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 shrink-0" />
                {fmt(totalOverage)} de exceso absorbidos por tu Colchón de Seguridad.
              </p>
            )}
            {cushionExceeded && (
              <p className="text-xs font-semibold text-accent-600 dark:text-accent-400 mt-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Colchón agotado: {fmt(cushionOverflow)} de exceso sin cubrir este mes.
              </p>
            )}
          </div>
        )}

        {/* Global Progress Card */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Presupuesto de Gastos</p>
              <p className="text-3xl font-black tracking-tight tabular-nums text-foreground">
                {fmt(totalBudget - totalSpent)}
                <span className="text-sm font-medium text-muted-foreground ml-2">disponible</span>
              </p>
            </div>
            <div className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
              globalProgress > 100 ? 'bg-accent-500/10 text-accent-600 dark:text-accent-400' :
              globalProgress >= 80 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
              'bg-secondary-500/10 text-secondary-600 dark:text-secondary-400'
            }`}>
              {globalProgress.toFixed(0)}% usado
            </div>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                globalProgress > 100 ? 'bg-accent-500' :
                globalProgress >= 80 ? 'bg-amber-400' :
                'bg-secondary-500'
              }`}
              style={{ width: `${Math.min(globalProgress, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-medium text-muted-foreground">
            <span>Gastado: {fmt(totalSpent)}</span>
            <span>Límite: {fmt(totalBudget)}</span>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map(b => {
              // El exceso de una categoría solo es alerta CRÍTICA (roja) si, tras la absorción
              // silenciosa de la bolsa libre, sigue superando el Colchón. Si la bolsa libre ya
              // lo cubre, no se atribuye nada al Colchón (queda intacto, sin aviso).
              const isCritical = b.status === 'exceeded' && cushionExceeded;
              const absorbedNote = b.status === 'exceeded' && !cushionExceeded && overageAfterFree > 0
                ? ' (absorbido por tu Colchón de Seguridad)'
                : '';

              return (
                <div key={`alert-${b.id}`} className={`rounded-xl p-3 flex items-center gap-3 border ${
                  isCritical ? 'bg-accent-500/10 border-accent-500/20' : 'bg-amber-500/10 border-amber-500/20'
                }`}>
                  <AlertTriangle className={`w-4 h-4 shrink-0 ${isCritical ? 'text-accent-500 dark:text-accent-400' : 'text-amber-500 dark:text-amber-400'}`} />
                  <p className={`text-xs font-medium flex-1 ${isCritical ? 'text-accent-700 dark:text-accent-400' : 'text-amber-700 dark:text-amber-400'}`}>
                    <span className="font-bold">{b.category.name}</span>
                    {b.status === 'exceeded'
                      ? ` — excedido en ${fmt(Math.abs(b.remaining))}${absorbedNote}`
                      : ` — al ${b.percentage.toFixed(0)}% del límite`
                    }
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Budget Cards */}
        {budgetData.length === 0 ? (
          <div className="bg-card rounded-2xl border border-dashed border-border p-12 text-center">
            <Target className="w-12 h-12 text-muted-foreground/60 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium mb-1">Sin presupuestos</p>
            <p className="text-sm text-muted-foreground mb-4">Crea uno para controlar tus gastos por categoría</p>
            <button
              onClick={() => { setEditingBudget(null); setIsModalOpen(true); }}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold"
            >
              Crear Presupuesto
            </button>
          </div>
        ) : (
          <>
            {expenseBudgets.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Gastos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {expenseBudgets.map(b => (
                    <BudgetCard key={b.id} b={b} onEdit={() => { setEditingBudget(b); setIsModalOpen(true); }} onDelete={() => handleDelete(b.id)} />
                  ))}
                </div>
              </div>
            )}

            {savingsBudgets.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 flex items-center gap-1.5">
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
        averageByCategory={averageByCategory}
        existingCategoryIds={budgets.map(b => b.category_id)}
      />

      <BudgetSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        income={income}
        cushion={cushion}
        onSaved={handleSettingsSaved}
      />
    </div>
  );
}

function BudgetCard({ b, isSavings, onEdit, onDelete }: { b: any; isSavings?: boolean; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${b.category.color}15` }}
          >
            <CategoryIcon name={b.category.icon} className="w-5 h-5" style={{ color: b.category.color }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{b.category.name}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {fmt(b.spent)} / {fmt(b.amount)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 hover:bg-accent-500/10 rounded-lg text-accent-500 dark:text-accent-400">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isSavings ? 'bg-secondary-500' :
            b.status === 'exceeded' ? 'bg-accent-500' :
            b.status === 'warning' ? 'bg-amber-400' :
            'bg-secondary-500'
          }`}
          style={{ width: `${Math.min(b.percentage, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-bold ${
          isSavings ? 'text-secondary-500 dark:text-secondary-400' :
          b.status === 'exceeded' ? 'text-accent-500 dark:text-accent-400' :
          b.status === 'warning' ? 'text-amber-500 dark:text-amber-400' :
          'text-secondary-500 dark:text-secondary-400'
        }`}>
          {b.percentage.toFixed(0)}%
        </span>
        <span className="text-[10px] font-medium text-muted-foreground">
          {isSavings
            ? (b.remaining >= 0 ? `${fmt(b.remaining)} para el objetivo` : `${fmt(Math.abs(b.remaining))} de más ahorrado`)
            : (b.remaining >= 0 ? `${fmt(b.remaining)} libre` : `${fmt(Math.abs(b.remaining))} excedido`)
          }
        </span>
      </div>
    </div>
  );
}
