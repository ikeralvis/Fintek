'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import CategoryIcon from '@/components/ui/CategoryIcon';

export default function SmartCategoryCard({ data, delay = 0 }: { data: any, delay?: number }) {
    const { name, icon, color, prediction, average, current, trend, insight } = data;

    // Calculate relative widths for bars (max is whichever is higher)
    const maxVal = Math.max(prediction, average, current, 1);
    const predPct = (prediction / maxVal) * 100;
    const currPct = (current / maxVal) * 100;
    const avgPct = (average / maxVal) * 100;

    return (
        <div
            className="bg-white rounded-[24px] p-6 border border-neutral-100 shadow-sm relative overflow-hidden animate-fade-in-up hover:shadow-md transition-shadow"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm border border-neutral-50"
                        style={{ backgroundColor: `${color}15` }}
                    >
                        <CategoryIcon name={icon} className="w-6 h-6" style={{ color }} />
                    </div>
                    <div>
                        <h3 className="font-bold text-neutral-900">{name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs font-bold text-neutral-400">Predicción:</span>
                            <span className="text-sm font-black text-neutral-900">
                                {new Intl.NumberFormat('es-ES').format(prediction)}€
                            </span>
                        </div>
                    </div>
                </div>

                {/* Trend Indicator */}
                {trend !== 0 && (
                    <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${trend > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                        {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(trend).toFixed(0)}%
                    </div>
                )}
            </div>

            {/* Insight Badge if available */}
            {insight && (
                <div className="mb-4 bg-indigo-50/50 p-2 rounded-xl flex items-start gap-2 border border-indigo-100/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0"></div>
                    <p className="text-xs font-bold text-indigo-700 leading-tight">{insight}</p>
                </div>
            )}

            {/* Comparison Bars */}
            <div className="space-y-3 mt-4">
                {/* Historic Average */}
                <div className="grid grid-cols-[60px_1fr_40px] gap-3 items-center text-xs">
                    <span className="font-bold text-neutral-400 text-right">Promedio</span>
                    <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-neutral-400 rounded-full"
                            style={{ width: `${avgPct}%` }}
                        ></div>
                    </div>
                    <span className="font-medium text-neutral-400 text-right">{Math.round(average)}€</span>
                </div>

                {/* Current Month */}
                <div className="grid grid-cols-[60px_1fr_40px] gap-3 items-center text-xs">
                    <span className="font-bold text-emerald-600 text-right">Actual</span>
                    <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${currPct}%` }}
                        ></div>
                    </div>
                    <span className="font-bold text-emerald-600 text-right">{Math.round(current)}€</span>
                </div>

                {/* Prediction */}
                <div className="grid grid-cols-[60px_1fr_40px] gap-3 items-center text-xs">
                    <span className="font-bold text-amber-500 text-right">Previsto</span>
                    <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-amber-400 rounded-full relative"
                            style={{ width: `${predPct}%` }}
                        >
                            {/* Stripe/Hatch pattern for prediction to indicate estimation */}
                            <div className="absolute inset-0 bg-white/20" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.25) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.25) 50%,rgba(255,255,255,.25) 75%,transparent 75%,transparent)', backgroundSize: '6px 6px' }}></div>
                        </div>
                    </div>
                    <span className="font-black text-amber-500 text-right">{Math.round(prediction)}€</span>
                </div>
            </div>
        </div>
    );
}
