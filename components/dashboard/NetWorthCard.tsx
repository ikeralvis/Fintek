import { TrendingUp, TrendingDown } from 'lucide-react';

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
                <p className="text-xs text-neutral-400 font-medium uppercase tracking-wide mb-1">Balance Total</p>
                <h1 className="text-4xl font-bold tracking-tight mb-4">
                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalBalance)}
                </h1>

                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        <span>{isPositive ? '+' : ''}{new Intl.NumberFormat('es-ES').format(netChange)}€</span>
                    </div>
                    <span className="text-neutral-500 text-sm">este mes</span>
                </div>

                <div className="flex gap-6 mt-4 pt-4 border-t border-white/10">
                    <div>
                        <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium">Ingresos</p>
                        <p className="text-lg font-semibold text-emerald-400">+{new Intl.NumberFormat('es-ES').format(monthlyIncome)}€</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium">Gastos</p>
                        <p className="text-lg font-semibold text-rose-400">-{new Intl.NumberFormat('es-ES').format(monthlyExpense)}€</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
