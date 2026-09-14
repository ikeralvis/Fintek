'use client';

import { ArrowUpRight, ArrowDownRight, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import CategoryIcon from '@/components/ui/CategoryIcon';

type Transaction = {
    id: string;
    amount: number;
    type: string;
    description?: string;
    transaction_date: string;
    category?: string;
    categories?: { name: string, icon?: string, color?: string } | null;
};

export default function RecentTransactionsList({ transactions }: { readonly transactions: Transaction[] }) {
    if (transactions.length === 0) {
        return (
            <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Recientes</h3>
                <div className="bg-card rounded-xl p-8 text-center border border-border">
                    <p className="text-muted-foreground text-sm">Aún no hay movimientos</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recientes</h3>
                <Link href="/dashboard/transacciones" className="text-xs font-semibold text-muted-foreground flex items-center gap-0.5 hover:text-foreground transition-colors">
                    Ver todo <ChevronRight className="w-3.5 h-3.5" />
                </Link>
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
                {transactions.map((t) => {
                    const categoryName = t.categories?.name || t.category || 'General';

                    return (
                        <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-muted/50"
                                style={t.categories?.color ? { backgroundColor: `${t.categories.color}15` } : undefined}
                            >
                                {t.categories?.icon ? (
                                    <CategoryIcon
                                        name={t.categories.icon}
                                        className="w-5 h-5"
                                        style={{ color: t.categories.color || 'var(--muted-foreground)' }}
                                    />
                                ) : t.type === 'expense' ? (
                                    <ArrowDownRight className="w-4 h-4 text-accent-500 dark:text-accent-400" />
                                ) : (
                                    <ArrowUpRight className="w-4 h-4 text-secondary-500 dark:text-secondary-400" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground text-sm truncate">{categoryName}</p>
                                <p className="text-xs text-muted-foreground">{format(parseISO(t.transaction_date), 'd MMM', { locale: es })}</p>
                            </div>

                            <p className={`font-semibold text-sm tabular-nums shrink-0 ${t.type === 'income' ? 'text-secondary-600 dark:text-secondary-400' : 'text-foreground'}`}>
                                {t.type === 'income' ? '+' : '-'}{new Intl.NumberFormat('es-ES').format(t.amount)}€
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
