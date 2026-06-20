import { getSpendingAnalysis } from '@/lib/actions/analysis';
import { Brain, AlertTriangle, ArrowLeft, TrendingUp, TrendingDown, Zap, BarChart3, Lightbulb } from 'lucide-react';
import SmartCategoryCard from '@/components/analysis/SmartCategoryCard';
import Link from 'next/link';

export default async function AnalysisPage() {
    const { data, error } = await getSpendingAnalysis();

    if (error || !data) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
                <div className="bg-rose-950/50 text-rose-400 p-6 rounded-2xl border border-rose-800/50 flex items-center gap-4 max-w-md">
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
        <div className="min-h-screen bg-neutral-950 pb-32 md:pb-12">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-800/50">
                <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
                    <Link href="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-neutral-800/50 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-neutral-400" />
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <h1 className="text-sm font-semibold text-neutral-200 tracking-tight">Predicción Inteligente</h1>
                    </div>
                    <div className="w-9" />
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-5 py-8 space-y-6">

                {/* === BENTO GRID TOP === */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    {/* Main Prediction - Spans 2 cols on desktop */}
                    <div className="md:col-span-2 relative overflow-hidden rounded-2xl border border-neutral-800/50 bg-neutral-900 p-6 md:p-8">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                        <div className="relative z-10">
                            <div className="flex items-center gap-2.5 mb-6">
                                <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl">
                                    <Brain className="w-5 h-5 text-amber-400" />
                                </div>
                                <div>
                                    <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Predicción</span>
                                    <p className="text-sm font-medium text-neutral-300 -mt-0.5">{monthName}</p>
                                </div>
                            </div>

                            <h2 className="text-5xl md:text-6xl font-black tracking-tighter text-white mb-3">
                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalPrediction)}
                            </h2>

                            {confidenceInterval && (
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <span className="bg-neutral-800 border border-neutral-700/50 px-3 py-1.5 rounded-lg font-mono text-neutral-400">
                                        {new Intl.NumberFormat('es-ES').format(confidenceInterval.low)}€ — {new Intl.NumberFormat('es-ES').format(confidenceInterval.high)}€
                                    </span>
                                    <span className="text-neutral-600 font-medium">intervalo de confianza</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right side stats stack */}
                    <div className="flex flex-col gap-4">
                        {/* Trend card */}
                        <div className="flex-1 rounded-2xl border border-neutral-800/50 bg-neutral-900 p-5 flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Tendencia</span>
                                {trendPercent > 0 ? (
                                    <TrendingUp className="w-4 h-4 text-amber-400" />
                                ) : (
                                    <TrendingDown className="w-4 h-4 text-emerald-400" />
                                )}
                            </div>
                            <div>
                                <p className={`text-3xl font-black tracking-tight ${trendPercent > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                    {trendPercent > 0 ? '+' : ''}{trendPercent.toFixed(1)}%
                                </p>
                                <p className="text-xs text-neutral-600 mt-1">vs. media histórica</p>
                            </div>
                        </div>

                        {/* Categories count */}
                        <div className="flex-1 rounded-2xl border border-neutral-800/50 bg-neutral-900 p-5 flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Categorías</span>
                                <BarChart3 className="w-4 h-4 text-neutral-500" />
                            </div>
                            <div>
                                <p className="text-3xl font-black tracking-tight text-white">{categories.length}</p>
                                <p className="text-xs text-neutral-600 mt-1">analizadas este mes</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Methodology pill */}
                {methodology && (
                    <div className="flex items-center gap-2.5 px-4 py-2.5 bg-neutral-900 border border-neutral-800/50 rounded-xl">
                        <Zap className="w-3.5 h-3.5 text-neutral-500" />
                        <span className="text-xs text-neutral-500 font-medium">{methodology}</span>
                    </div>
                )}

                {/* === INSIGHTS BENTO === */}
                {insights && insights.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <Lightbulb className="w-4 h-4 text-neutral-600" />
                            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Insights</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {insights.map((insight: string, idx: number) => (
                                <div
                                    key={`insight-${idx}`}
                                    className="rounded-2xl p-4 border border-neutral-800/50 bg-neutral-900 hover:bg-neutral-800/50 transition-colors group"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0 group-hover:scale-125 transition-transform" />
                                        <p className="text-sm text-neutral-300 font-medium leading-relaxed">{insight}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* === CATEGORY BREAKDOWN BENTO GRID === */}
                <div className="space-y-4">
                    <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider px-1">Desglose por Categoría</h3>

                    {categories.length === 0 ? (
                        <div className="text-center py-16 bg-neutral-900 rounded-2xl border border-neutral-800/50 border-dashed">
                            <Brain className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
                            <p className="text-neutral-500 font-medium">No hay suficientes datos para predecir.</p>
                            <p className="text-neutral-600 text-sm mt-1">Añade más transacciones para ver predicciones.</p>
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
