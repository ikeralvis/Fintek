'use client';

import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

type Transaction = {
    id: string;
    amount: number;
    type: string;
    description: string;
    transaction_date: string;
    category?: string; // Expecting string here for simple list
    categories?: { name: string, icon?: string, color?: string }; // Or object if coming from join
};

export default function RecentTransactionsList({ transactions }: { transactions: Transaction[] }) {
    if (transactions.length === 0) {
        return (
            <div className="mt-8">
                <h3 className="text-lg font-bold text-neutral-900 mb-4">Recientes</h3>
                <div className="bg-white rounded-3xl p-8 text-center border border-neutral-100 shadow-sm">
                    <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl">🍃</span>
                    </div>
                    <p className="text-neutral-500 font-medium">Aún no hay movimientos</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-8 mb-24">
            <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-lg font-bold text-neutral-900">Recientes</h3>
                <a href="/dashboard/transacciones" className="text-sm font-bold text-blue-600 hover:text-blue-700">Ver todo</a>
            </div>

            <div className="bg-white rounded-[32px] border border-neutral-100 shadow-sm overflow-hidden divide-y divide-neutral-50">
                {transactions.map((t) => {
                    const categoryName = t.categories?.name || t.category || 'General';
                    const hasDescription = t.description && t.description !== categoryName;

                    return (
                        <div key={t.id} className="p-5 flex items-center gap-4 hover:bg-neutral-50 transition-colors">
                            <div
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-neutral-100 shadow-sm`}
                                style={{ backgroundColor: t.categories?.color ? `${t.categories.color}15` : (t.type === 'expense' ? '#fff1f2' : '#ecfdf5') }}
                            >
                                {t.categories?.icon ? <span className="text-xl">{t.categories.icon}</span> : (
                                    t.type === 'expense'
                                        ? <ArrowDownRight className="w-5 h-5 text-rose-500" />
                                        : <ArrowUpRight className="w-5 h-5 text-emerald-500" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-0.5">
                                    <p className="font-bold text-neutral-900 truncate pr-2 text-sm">{categoryName}</p>
                                    <p className={`font-bold whitespace-nowrap text-sm ${t.type === 'income' ? 'text-emerald-600' : 'text-neutral-900'}`}>
                                        {t.type === 'income' ? '+' : '-'}{new Intl.NumberFormat('es-ES').format(t.amount)}€
                                    </p>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <div className="flex flex-col">
                                        {hasDescription && <span className="text-neutral-500 truncate lowercase max-w-[150px]">{t.description}</span>}
                                        <span className="text-neutral-300 font-medium mt-0.5 capitalize">{format(parseISO(t.transaction_date), 'd MMM', { locale: es })}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
