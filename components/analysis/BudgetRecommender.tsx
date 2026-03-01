'use client';

import { CategoryAnalysis } from '@/lib/utils/analysis';
import { ArrowDownIcon, ArrowRightIcon, ArrowUpIcon, InfoIcon } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';

interface Props {
    readonly data: CategoryAnalysis[];
}

export default function BudgetRecommender({ data }: Props) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.map((cat) => (
                    <div key={cat.categoryId} className="bg-white rounded-3xl border border-neutral-200/60 shadow-card hover:shadow-medium transition-all duration-300 p-6 flex flex-col justify-between h-auto min-h-[200px]">

                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-neutral-900 text-lg tracking-tight">{cat.categoryName}</h3>
                                <div className="flex items-center gap-1.5 mt-1">
                                    {cat.trend === 'increasing' && (
                                        <div className="flex items-center text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                                            <ArrowUpIcon className="w-3 h-3 mr-1" />
                                            Tendencia alza
                                        </div>
                                    )}
                                    {cat.trend === 'decreasing' && (
                                        <div className="flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                            <ArrowDownIcon className="w-3 h-3 mr-1" />
                                            Optimizando
                                        </div>
                                    )}
                                    {cat.trend === 'stable' && (
                                        <div className="flex items-center text-xs font-semibold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full border border-neutral-200">
                                            <ArrowRightIcon className="w-3 h-3 mr-1" />
                                            Estable
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-0.5">ESTIMADO</span>
                                <span className="text-2xl font-bold text-neutral-900 tracking-tighter">
                                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cat.predictedNextMonth)}
                                </span>
                            </div>
                        </div>

                        {/* Sparkline Area Chart */}
                        <div className="h-24 w-full -mx-2 mb-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={cat.history}>
                                    <defs>
                                        <linearGradient id={`gradient-${cat.categoryId}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: '1px solid #e5e5e5', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value: number | undefined) => [value !== undefined ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value) : '€0.00', 'Gasto']}
                                        labelStyle={{ display: 'none' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="amount"
                                        stroke="#6366f1"
                                        strokeWidth={2}
                                        fill={`url(#gradient-${cat.categoryId})`}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Suggested Budget Footer */}
                        <div className="pt-4 border-t border-neutral-100 flex justify-between items-center mt-auto">
                            <div className="flex items-center gap-2 text-neutral-500 text-sm">
                                <InfoIcon className="w-4 h-4" />
                                <span>Presupuesto ideal:</span>
                            </div>
                            <span className="font-bold text-neutral-900 bg-neutral-100 px-3 py-1 rounded-lg border border-neutral-200 text-sm">
                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(cat.suggestedBudget)}
                            </span>
                        </div>

                    </div>
                ))}
            </div>
        </div>
    );
}
