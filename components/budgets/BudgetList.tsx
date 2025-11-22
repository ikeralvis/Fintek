'use client';

import { Trash2, AlertTriangle } from 'lucide-react';
import { deleteBudget } from '@/lib/actions/budgets';
import { useState } from 'react';

type Budget = {
    id: string;
    amount: number;
    category_id: string;
    categories: {
        name: string;
    };
    spent: number;
    percentage: number;
    remaining: number;
};

type Props = {
    budgets: Budget[];
};

export default function BudgetList({ budgets }: Props) {
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este presupuesto?')) return;

        setDeletingId(id);
        await deleteBudget(id);
        setDeletingId(null);
    };

    if (budgets.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-xl shadow-soft">
                <div className="bg-neutral-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="h-8 w-8 text-neutral-400" />
                </div>
                <h3 className="text-lg font-medium text-neutral-900">No hay presupuestos definidos</h3>
                <p className="text-neutral-500 mt-1">Crea un presupuesto para empezar a controlar tus gastos.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {budgets.map((budget) => {
                // Determine color based on percentage
                let progressColor = 'bg-primary-500';
                let textColor = 'text-primary-600';
                let bgColor = 'bg-primary-50';

                if (budget.percentage >= 100) {
                    progressColor = 'bg-accent-500';
                    textColor = 'text-accent-600';
                    bgColor = 'bg-accent-50';
                } else if (budget.percentage >= 80) {
                    progressColor = 'bg-yellow-500';
                    textColor = 'text-yellow-600';
                    bgColor = 'bg-yellow-50';
                } else {
                    progressColor = 'bg-secondary-500';
                    textColor = 'text-secondary-600';
                    bgColor = 'bg-secondary-50';
                }

                return (
                    <div key={budget.id} className="bg-white rounded-xl shadow-soft p-6 relative group">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-neutral-900">{budget.categories?.name || 'Sin categoría'}</h3>
                                <p className="text-sm text-neutral-500">Mensual</p>
                            </div>
                            <button
                                onClick={() => handleDelete(budget.id)}
                                disabled={deletingId === budget.id}
                                className="p-2 text-neutral-400 hover:text-accent-500 hover:bg-accent-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                title="Eliminar presupuesto"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="mb-2 flex justify-between items-end">
                            <span className="text-2xl font-bold text-neutral-900">
                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(budget.spent)}
                            </span>
                            <span className="text-sm font-medium text-neutral-500 mb-1">
                                de {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(budget.amount)}
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-neutral-100 rounded-full h-3 mb-4 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                                style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                            />
                        </div>

                        <div className={`flex items-center justify-between text-sm font-medium p-3 rounded-lg ${bgColor} ${textColor}`}>
                            <span>
                                {budget.percentage >= 100 ? '¡Presupuesto excedido!' : `${Math.round(budget.percentage)}% gastado`}
                            </span>
                            <span>
                                {budget.remaining < 0
                                    ? `${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Math.abs(budget.remaining))} exceso`
                                    : `${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(budget.remaining)} restante`
                                }
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
