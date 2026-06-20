import { getSpendingAnalysis } from '@/lib/actions/analysis';
import { Brain, AlertTriangle, ArrowLeft, TrendingUp, TrendingDown, Zap, BarChart3, Lightbulb } from 'lucide-react';
import SmartCategoryCard from '@/components/analysis/SmartCategoryCard';
import Link from 'next/link';

export default async function AnalysisPage() {
    const { data, error } = await getSpendingAnalysis();

    if (error || !data) {
        return (
            <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
                <div className="bg-rose-50 text-rose-600 p-6 rounded-2xl border border-rose-100 flex items-center gap-4 max-w-md">
                    <AlertTriangle className="w-6 h-6 shrink-0" />
                    <span className="font-medium text-sm">No se pudieron cargar las predicciones. Inténtalo más tarde.</span>
                </div>
            </div>
        );
    }

    const { categories, totalPrediction, confidenceInterval, monthName, insights, methodology } = data;

    const trendPercent = categories.length > 0
        ? categories.reduce((sum: number, c: any) => sum + (c.trend || 0), 0) / categories.length
        : 0;

    return (
        <div className="min-h-screen bg-neutral-50 pb-32 md:pb-8">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-neutral-50/80 backdrop-blur-xl border-b border-neutral-100">
                <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
                    <Link href="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-neutral-100 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-neutral-700" />
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <h1 className="text-sm font-semibold text-neutral-900 tracking-tight">Predicción Inteligente</h1>
                    </div>
                    <div className="w-9" />
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-5 py-8 space-y-6">

                {/* === BENTO GRID TOP === */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    {/* Main Prediction */}
                    <div className="md:col-span-2 relative overflow-hidden rounded-2xl border border-neutral-200/60 bg-white p-6 md:p-8 shadow-sm">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-100/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                        <div className="relative z-10">
                            <div className="flex items-center gap-2.5 mb-6">
                                <div className="bg-amber-50 border border-amber-200/50 p-2 rounded-xl">
                                    <Brain className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Predicción</span>
                                    <p className="text-sm font-medium text-neutral-700 -mt-0.5">{monthName}</p>
                                </div>
                            </div>

                            <h2 className="text-5xl md:text-6xl font-black tracking-tighter text-neutral-900 mb-3">
                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalPrediction)}
                            </h2>

                            {confidenceInterval && (
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <span className="bg-neutral-100 border border-neutral-200/50 px-3 py-1.5 rounded-lg font-mono text-neutral-500">
                                        {new Intl.NumberFormat('es-ES').format(confidenceInterval.low)}€ — {new Intl.NumberFormat('es-ES').format(confidenceInterval.high)}€
                                    </span>
                                    <span className="text-neutral-400 font-medium">intervalo de confianza</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right side stats */}
                    <div className="flex flex-col gap-4">
                        <div className="flex-1 rounded-2xl border border-neutral-200/60 bg-white p-5 flex flex-col justify-between shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Tendencia</span>
                                {trendPercent > 0 ? (
                                    <TrendingUp className="w-4 h-4 text-amber-500" />
                                ) : (
                                    <TrendingDown className="w-4 h-4 text-emerald-500" />
                                )}
                            </div>
                            <div>
                                <p className={`text-3xl font-black tracking-tight ${trendPercent > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                    {trendPercent > 0 ? '+' : ''}{trendPercent.toFixed(1)}%
                                </p>
                                <p className="text-xs text-neutral-400 mt-1">vs. media histórica</p>
                            </div>
                        </div>

                        <div className="flex-1 rounded-2xl border border-neutral-200/60 bg-white p-5 flex flex-col justify-between shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Categorías</span>
                                <BarChart3 className="w-4 h-4 text-neutral-400" />
                            </div>
                            <div>
                                <p className="text-3xl font-black tracking-tight text-neutral-900">{categories.length}</p>
                                <p className="text-xs text-neutral-400 mt-1">analizadas este mes</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Methodology */}
                {methodology && (
                    <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white border border-neutral-200/60 rounded-xl shadow-sm">
                        <Zap className="w-3.5 h-3.5 text-neutral-400" />
                        <span className="text-xs text-neutral-500 font-medium">{methodology}</span>
                    </div>
                )}

                {/* Insights */}
                {insights && insights.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <Lightbulb className="w-4 h-4 text-neutral-400" />
                            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Insights</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {insights.map((insight: string, idx: number) => (
                                <div
                                    key={`insight-${idx}`}
                                    className="rounded-2xl p-4 border border-neutral-200/60 bg-white hover:border-neutral-300 transition-colors shadow-sm group"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0 group-hover:scale-125 transition-transform" />
                                        <p className="text-sm text-neutral-600 font-medium leading-relaxed">{insight}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Category Breakdown */}
                <div className="space-y-4">
                    <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-1">Desglose por Categoría</h3>

                    {categories.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-neutral-200">
                            <Brain className="w-12 h-12 text-neutral-200 mx-auto mb-3" />
                            <p className="text-neutral-400 font-medium">No hay suficientes datos para predecir.</p>
                            <p className="text-neutral-300 text-sm mt-1">Añade más transacciones para ver predicciones.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {categories.map((cat: any, index: number) => (
                                <SmartCategoryCard
                                    key={cat.categoryId}
                                    data={cat}
                                    delay={index * 50}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
