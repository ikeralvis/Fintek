'use client';

import { ArrowUpRight, ArrowDownRight, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

type Transaction = {
    id: string;
    amount: number;
    type: string;
    description: string;
    transaction_date: string;
    category?: string;
    categories?: { name: string, icon?: string, color?: string };
};

export default function RecentTransactionsList({ transactions }: { transactions: Transaction[] }) {
    if (transactions.length === 0) {
        return (
            <div>
                <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">Recientes</h3>
                <div className="bg-white rounded-xl p-8 text-center border border-neutral-100">
                    <p className="text-neutral-400 text-sm">Aún no hay movimientos</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">Recientes</h3>
                <Link href="/dashboard/transacciones" className="text-xs font-semibold text-neutral-400 flex items-center gap-0.5 hover:text-neutral-600">
                    Ver todo <ChevronRight className="w-3.5 h-3.5" />
                </Link>
            </div>

            <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden divide-y divide-neutral-50">
                {transactions.map((t) => {
                    const categoryName = t.categories?.name || t.category || 'General';

                    return (
                        <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                style={{ backgroundColor: t.categories?.color ? `${t.categories.color}15` : '#f5f5f5' }}
                            >
                                {t.categories?.icon ? (
                                    <span className="text-lg">{t.categories.icon}</span>
                                ) : t.type === 'expense' ? (
                                    <ArrowDownRight className="w-4 h-4 text-rose-500" />
                                ) : (
                                    <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-neutral-900 text-sm truncate">{categoryName}</p>
                                <p className="text-xs text-neutral-400">{format(parseISO(t.transaction_date), 'd MMM', { locale: es })}</p>
                            </div>

                            <p className={`font-semibold text-sm ${t.type === 'income' ? 'text-emerald-600' : 'text-neutral-900'}`}>
                                {t.type === 'income' ? '+' : '-'}{new Intl.NumberFormat('es-ES').format(t.amount)}€
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
