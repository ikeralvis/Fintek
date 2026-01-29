import { TrendingUp, TrendingDown, Sparkles } from 'lucide-react';

type Props = {
    totalBalance: number;
    monthlyIncome?: number;
    monthlyExpense?: number;
};

export default function NetWorthCard({ totalBalance, monthlyIncome = 0, monthlyExpense = 0 }: Props) {
    const netChange = monthlyIncome - monthlyExpense;
    const isPositive = netChange >= 0;

    return (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 p-8 text-white shadow-2xl">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-emerald-500/10 to-cyan-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                        </div>
                        <span className="text-sm font-medium text-white/60">Patrimonio Neto</span>
                    </div>
                </div>

                <h1 className="text-5xl font-black tracking-tight mb-6">
                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalBalance)}
                </h1>

                <div className="flex items-center gap-6">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${isPositive ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                        {isPositive ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-rose-400" />}
                        <span className={`text-sm font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isPositive ? '+' : ''}{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(netChange)}
                        </span>
                        <span className="text-white/40 text-sm">este mes</span>
                    </div>

                    <div className="flex gap-4 text-sm">
                        <div>
                            <span className="text-white/40">Ingresos</span>
                            <p className="font-bold text-emerald-400">+{new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(monthlyIncome)}€</p>
                        </div>
                        <div>
                            <span className="text-white/40">Gastos</span>
                            <p className="font-bold text-rose-400">-{new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(monthlyExpense)}€</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
