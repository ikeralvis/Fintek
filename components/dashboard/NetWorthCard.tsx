import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

type Props = {
    totalBalance: number;
    monthlyIncome?: number;
    monthlyExpense?: number;
};

export default function NetWorthCard({ totalBalance, monthlyIncome = 0, monthlyExpense = 0 }: Props) {
    const netChange = monthlyIncome - monthlyExpense;
    const isPositive = netChange >= 0;

    return (
        <div className="relative overflow-hidden rounded-2xl bg-neutral-900 p-6 text-white">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />

            <div className="relative z-10">
                <p className="text-xs text-white/50 font-medium uppercase tracking-wide mb-1">Balance Total</p>
                <h1 className="text-4xl font-bold tracking-tight tabular-nums mb-4">
                    {formatCurrency(totalBalance)}
                </h1>

                <div className="flex items-center gap-2 flex-wrap">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold tabular-nums ${isPositive ? 'bg-secondary-500/20 text-secondary-400' : 'bg-accent-500/20 text-accent-400'}`}>
                        {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        <span>{isPositive ? '+' : ''}{formatCurrency(netChange)}</span>
                    </div>
                    <span className="text-white/50 text-sm">Balance neto de este mes</span>
                </div>

                <div className="flex gap-6 mt-4 pt-4 border-t border-white/10">
                    <div>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider font-medium">Ingresos</p>
                        <p className="text-lg font-semibold tabular-nums text-secondary-400">
                            +{formatCurrency(monthlyIncome)}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider font-medium">Gastos</p>
                        <p className="text-lg font-semibold tabular-nums text-accent-400">
                            {formatCurrency(monthlyExpense > 0 ? -monthlyExpense : 0)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
