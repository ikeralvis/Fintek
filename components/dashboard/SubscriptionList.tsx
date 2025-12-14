'use client';

import { useState } from 'react';
import { Trash2, Calendar, RefreshCw } from 'lucide-react';
import { deleteRecurringTransaction } from '@/lib/actions/recurring';

type Subscription = {
    id: string;
    description: string;
    amount: number;
    frequency: string;
    next_run_date: string;
    accounts: { name: string };
    categories: { name: string };
};

type Props = {
    subscriptions: Subscription[];
};

export default function SubscriptionList({ subscriptions }: Readonly<Props>) {
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de que quieres cancelar esta suscripción?')) return;

        setLoadingId(id);
        await deleteRecurringTransaction(id);
        setLoadingId(null);
    };

    if (subscriptions.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-xl shadow-soft">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 mb-4">
                    <RefreshCw className="h-8 w-8 text-neutral-400" />
                </div>
                <h3 className="text-lg font-medium text-neutral-900">No tienes suscripciones</h3>
                <p className="text-neutral-500 mt-1 max-w-sm mx-auto">
                    Añade tus gastos recurrentes como Netflix, Internet o el gimnasio para llevar un control automático.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-neutral-900 mb-4">Mis Suscripciones Activas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subscriptions.map((sub) => (
                    <div key={sub.id} className="bg-white rounded-xl shadow-soft p-5 border-l-4 border-l-primary-500 hover:shadow-medium transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h4 className="font-bold text-neutral-900 text-lg">{sub.description || 'Sin nombre'}</h4>
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 capitalize">
                                    {(() => {
                                        if (sub.frequency === 'monthly') return 'Mensual';
                                        if (sub.frequency === 'yearly') return 'Anual';
                                        return 'Semanal';
                                    })()}
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="block text-xl font-bold text-neutral-900">
                                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(sub.amount)}
                                </span>
                                <span className="text-xs text-neutral-500">{sub.categories?.name}</span>
                            </div>
                        </div>

                        <div className="flex items-center text-sm text-neutral-600 mb-4">
                            <Calendar className="h-4 w-4 mr-1.5 text-primary-500" />
                            <span>Próximo cobro: <strong>{new Date(sub.next_run_date).toLocaleDateString()}</strong></span>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-neutral-100">
                            <span className="text-xs text-neutral-500">
                                Paga con: {sub.accounts?.name}
                            </span>
                            <button
                                onClick={() => handleDelete(sub.id)}
                                disabled={loadingId === sub.id}
                                className="text-neutral-400 hover:text-red-600 transition-colors p-1"
                                title="Cancelar suscripción"
                            >
                                {loadingId === sub.id ? (
                                    <div className="animate-spin h-4 w-4 border-2 border-neutral-400 border-t-transparent rounded-full" />
                                ) : (
                                    <Trash2 className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
