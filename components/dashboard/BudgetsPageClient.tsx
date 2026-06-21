'use client';

import { useState, useMemo, useEffect } from 'react';
import { useDashboard } from '@/lib/DashboardContext';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Target, Plus, AlertTriangle, TrendingUp, Pencil, Trash2
} from 'lucide-react';
import Link from 'next/link';
import CategoryIcon from '@/components/ui/CategoryIcon';
import BudgetFormModal from './BudgetFormModal';

export default function BudgetsPageClient() {
  const { transactions, categories, userId } = useDashboard();
  const router = useRouter();
  const supabase = createClient();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any>(null);

  useEffect(() => {
    const fetchBudgets = async () => {
      const { data } = await supabase.from('budgets').select('*').eq('user_id', userId);
      setBudgets(data || []);
      setLoading(false);
    };
    fetchBudgets();
  }, [userId]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const categoriesMap = useMemo(() =>
    categories.reduce((acc: any, c) => ({ ...acc, [c.id]: c }), {}),
  [categories]);

  const spendingMap = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.type === 'expense' && t.transaction_date >= startOfMonth && t.category_id) {
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

  const totalBudget = budgetData.reduce((acc, b) => acc + b.amount, 0);
  const totalSpent = budgetData.reduce((acc, b) => acc + b.spent, 0);
  const globalProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const alerts = budgetData.filter(b => b.status === 'warning' || b.status === 'exceeded');

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

        {/* Global Progress Card */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-neutral-400 font-medium uppercase tracking-wide">Presupuesto del Mes</p>
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
                    ? ` — excedido en ${Math.abs(b.remaining).toLocaleString('es-ES')}€`
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {budgetData.map(b => (
              <div key={b.id} className="bg-white rounded-2xl border border-neutral-100 p-4 group">
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
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditingBudget(b); setIsModalOpen(true); }}
                      className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-400"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress */}
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      b.status === 'exceeded' ? 'bg-rose-500' :
                      b.status === 'warning' ? 'bg-amber-400' :
                      'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(b.percentage, 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold ${
                    b.status === 'exceeded' ? 'text-rose-500' :
                    b.status === 'warning' ? 'text-amber-500' :
                    'text-emerald-500'
                  }`}>
                    {b.percentage.toFixed(0)}%
                  </span>
                  <span className="text-[10px] font-medium text-neutral-400">
                    {b.remaining >= 0 ? `${b.remaining.toLocaleString('es-ES')}€ libre` : `${Math.abs(b.remaining).toLocaleString('es-ES')}€ excedido`}
                  </span>
                </div>
              </div>
            ))}
          </div>
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
