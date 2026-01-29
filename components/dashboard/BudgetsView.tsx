'use client';

import { useState, useMemo } from 'react';
import {
    Settings, Target, AlertTriangle, TrendingUp,
    ArrowRight, CheckCircle, Wallet, Plus, Edit2
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import BudgetFormModal from '@/components/dashboard/BudgetFormModal';

export default function BudgetsView({ initialBudgets, currentExpenses, categories }: any) {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBudget, setEditingBudget] = useState<any | null>(null);

    // Filter "valid" budgets (ensure category exists in list)
    // Sometimes categories get deleted but budget remains, so we handle safety here.
    const validBudgets = useMemo(() => {
        return initialBudgets.filter((b: any) => categories.some((c: any) => c.id === b.category_id));
    }, [initialBudgets, categories]);

    // Map Categories
    const categoriesMap = useMemo(() => {
        return categories.reduce((acc: any, c: any) => ({ ...acc, [c.id]: c }), {});
    }, [categories]);

    // Calculate Spending per Category
    const spendingMap = useMemo(() => {
        const map: Record<string, number> = {};
        currentExpenses.forEach((t: any) => {
            if (t.category_id) {
                map[t.category_id] = (map[t.category_id] || 0) + t.amount;
            }
        });
        return map;
    }, [currentExpenses]);

    // Combine Budget + Spending
    const budgetData = useMemo(() => {
        return validBudgets.map((b: any) => {
            const spent = spendingMap[b.category_id] || 0;
            const percentage = b.amount > 0 ? (spent / b.amount) * 100 : 0;
            const remaining = b.amount - spent;
            const category = categoriesMap[b.category_id] || { name: 'Desconocido', icon: '?', color: '#ccc' };

            return {
                ...b,
                spent,
                percentage,
                remaining,
                category,
                status: percentage > 100 ? 'exceeded' : percentage > 70 ? 'warning' : 'safe'
            };
        }).sort((a: any, b: any) => b.percentage - a.percentage);
    }, [validBudgets, spendingMap, categoriesMap]);

    // Totals
    const totalBudget = validBudgets.reduce((acc: number, b: any) => acc + b.amount, 0);
    const totalSpent = budgetData.reduce((acc: number, b: any) => acc + b.spent, 0);
    const totalRemaining = totalBudget - totalSpent;
    const globalProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    const handleEdit = (budget: any) => {
        setEditingBudget(budget);
        setIsModalOpen(true);
    };

    const handleNew = () => {
        setEditingBudget(null);
        setIsModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-neutral-50 pb-40">
            {/* Header */}
            <div className="bg-white sticky top-0 z-20 px-6 py-4 flex items-center justify-between border-b border-neutral-100">
                <h1 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                    <Target className="w-6 h-6 text-indigo-600" />
                    Presupuestos
                </h1>
                <button
                    onClick={handleNew}
                    className="p-2 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 transition-colors shadow-lg shadow-neutral-900/20"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            <div className="container mx-auto px-4 pt-8 max-w-2xl space-y-8">

                {/* GLOBAL SUMMARY */}
                <div className="bg-black text-white rounded-[32px] p-8 relative overflow-hidden shadow-2xl animate-fade-in">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                    <div className="relative z-10">
                        <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Disponible del Mes</p>
                        <h2 className="text-4xl font-black mb-6">
                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalRemaining)}
                            <span className="text-sm font-medium text-white/50 ml-2">de {new Intl.NumberFormat('es-ES').format(totalBudget)}€</span>
                        </h2>

                        <div className="h-3 bg-neutral-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-1000 ease-out ${globalProgress > 100 ? 'bg-rose-500' : globalProgress > 80 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                style={{ width: `${Math.min(globalProgress, 100)}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between mt-2 text-xs font-bold text-neutral-400">
                            <span>0%</span>
                            <span>{globalProgress.toFixed(0)}% Gastado</span>
                            <span>100%</span>
                        </div>
                    </div>
                </div>

                {/* ALERTS */}
                {budgetData.filter((b: any) => b.status === 'exceeded').map((b: any) => (
                    <div key={b.id} className="bg-rose-50 border border-rose-100 rounded-[24px] p-5 flex items-start gap-4 animate-shake">
                        <div className="p-2 bg-rose-100 rounded-xl text-rose-600">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-rose-700">¡Presupuesto Excedido!</h3>
                            <p className="text-sm text-rose-600/80 mt-1">
                                Has superado tu límite de <span className="font-black">{b.category.name}</span> en
                                <span className="font-black ml-1">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Math.abs(b.remaining))}</span>.
                            </p>
                        </div>
                    </div>
                ))}

                {/* CATEGORY LIST */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                        <h3 className="text-sm font-black text-neutral-400 uppercase tracking-widest">Estado por Categoría</h3>
                    </div>

                    {budgetData.length === 0 ? (
                        <div className="bg-white rounded-[32px] p-10 text-center border border-dashed border-neutral-200">
                            <Target className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                            <p className="text-neutral-400 font-bold mb-4">No tienes presupuestos definidos</p>
                            <button
                                onClick={handleNew}
                                className="bg-neutral-900 text-white px-6 py-3 rounded-2xl font-bold text-sm"
                            >
                                Crear Primer Presupuesto
                            </button>
                        </div>
                    ) : (
                        budgetData.map((b: any, index: number) => (
                            <div
                                key={b.id}
                                onClick={() => handleEdit(b)}
                                className="bg-white p-6 rounded-[32px] border border-neutral-100 shadow-sm relative overflow-hidden group hover:border-neutral-300 cursor-pointer transition-all active:scale-[0.98]"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm border border-neutral-50"
                                            style={{ backgroundColor: `${b.category.color}15`, color: b.category.color }}
                                        >
                                            {b.category.icon}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-neutral-900">{b.category.name}</h4>
                                            <p className="text-xs text-neutral-500 font-bold">
                                                {new Intl.NumberFormat('es-ES').format(b.spent)}€ / {new Intl.NumberFormat('es-ES').format(b.amount)}€
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${b.status === 'exceeded' ? 'bg-rose-100 text-rose-600' :
                                            b.status === 'warning' ? 'bg-amber-100 text-amber-600' :
                                                'bg-emerald-100 text-emerald-600'
                                        }`}>
                                        {b.status === 'exceeded' ? 'Excedido' : b.status === 'warning' ? 'Cuidado' : 'En plan'}
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="h-4 bg-neutral-100 rounded-full overflow-hidden relative">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ${b.status === 'exceeded' ? 'bg-rose-500 animate-pulse' :
                                                b.status === 'warning' ? 'bg-amber-400' :
                                                    'bg-emerald-400'
                                            }`}
                                        style={{ width: `${Math.min(b.percentage, 100)}%` }}
                                    >
                                        {/* Stripe effect */}
                                        <div className="absolute inset-0 bg-white/20" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }}></div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* TRENDS CHART */}
                <div className="bg-white rounded-[32px] p-6 border border-neutral-100 shadow-sm mt-8">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="w-5 h-5 text-indigo-500" />
                        <h3 className="font-bold text-neutral-900">Análisis: Presupuesto vs Real</h3>
                    </div>

                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={budgetData.slice(0, 5)} layout="vertical" margin={{ left: 10 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="category.name" type="category" width={80} tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="amount" name="Presupuesto" fill="#e2e8f0" radius={[0, 4, 4, 0]} barSize={10} isAnimationActive={true} animationDuration={1500} />
                                <Bar dataKey="spent" name="Real" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={10} isAnimationActive={true} animationDuration={1500} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            <BudgetFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                categories={categories}
                existingBudget={editingBudget}
            />
        </div>
    );
}
