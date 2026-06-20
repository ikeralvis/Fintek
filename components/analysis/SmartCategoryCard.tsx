'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import CategoryIcon from '@/components/ui/CategoryIcon';

export default function SmartCategoryCard({ data, delay = 0 }: { data: any, delay?: number }) {
    const { name, icon, color, prediction, average, current, trend, insight } = data;

    const maxVal = Math.max(prediction, average, current, 1);
    const predPct = (prediction / maxVal) * 100;
    const currPct = (current / maxVal) * 100;
    const avgPct = (average / maxVal) * 100;

    return (
        <div
            className="rounded-2xl p-5 border border-neutral-200/60 bg-white hover:border-neutral-300 transition-all shadow-sm group animate-fade-in"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${color}15` }}
                    >
                        <CategoryIcon name={icon} className="w-5 h-5" style={{ color }} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-neutral-900 text-sm">{name}</h3>
                        <span className="text-lg font-black text-neutral-900 tracking-tight">
                            {new Intl.NumberFormat('es-ES').format(prediction)}€
                        </span>
                    </div>
                </div>

                {trend !== 0 && (
                    <div className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                        trend > 0
                            ? 'bg-amber-50 text-amber-600 border border-amber-200/50'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-200/50'
                    }`}>
                        {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(trend).toFixed(0)}%
                    </div>
                )}
            </div>

            {insight && (
                <div className="mb-4 bg-neutral-50 p-2.5 rounded-xl flex items-start gap-2 border border-neutral-100">
                    <div className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    <p className="text-[11px] font-medium text-neutral-500 leading-tight">{insight}</p>
                </div>
            )}

            <div className="space-y-2.5">
                <div className="flex items-center gap-3 text-xs">
                    <span className="w-14 text-right font-medium text-neutral-400 shrink-0">Promedio</span>
                    <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div className="h-full bg-neutral-300 rounded-full transition-all duration-500" style={{ width: `${avgPct}%` }} />
                    </div>
                    <span className="w-10 text-right font-mono text-neutral-400 text-[11px]">{Math.round(average)}€</span>
                </div>

                <div className="flex items-center gap-3 text-xs">
                    <span className="w-14 text-right font-medium text-emerald-600 shrink-0">Actual</span>
                    <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${currPct}%` }} />
                    </div>
                    <span className="w-10 text-right font-mono text-emerald-600 text-[11px]">{Math.round(current)}€</span>
                </div>

                <div className="flex items-center gap-3 text-xs">
                    <span className="w-14 text-right font-medium text-amber-500 shrink-0">Previsto</span>
                    <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full transition-all duration-500 relative" style={{ width: `${predPct}%` }}>
                            <div className="absolute inset-0 bg-white/20" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.25) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.25) 50%,rgba(255,255,255,.25) 75%,transparent 75%,transparent)', backgroundSize: '6px 6px' }} />
                        </div>
                    </div>
                    <span className="w-10 text-right font-mono text-amber-500 font-bold text-[11px]">{Math.round(prediction)}€</span>
                </div>
            </div>
        </div>
    );
}
