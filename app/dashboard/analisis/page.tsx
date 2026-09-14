import { getSpendingAnalysis } from '@/lib/actions/analysis';
import { Brain, AlertTriangle, ArrowLeft, TrendingUp, TrendingDown, Sparkles, Info } from 'lucide-react';
import SmartCategoryCard from '@/components/analysis/SmartCategoryCard';
import TrendsChart from '@/components/analysis/TrendsChart';
import Link from 'next/link';

export default async function AnalysisPage() {
    const { data, error } = await getSpendingAnalysis();

    if (error || !data) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-6">
                <div className="bg-accent-500/10 text-accent-600 dark:text-accent-400 p-6 rounded-2xl border border-accent-500/20 flex items-center gap-4 max-w-md">
                    <AlertTriangle className="w-6 h-6 shrink-0" />
                    <span className="font-medium text-sm">No se pudieron cargar las predicciones. Inténtalo más tarde.</span>
                </div>
            </div>
        );
    }

    const { categories, totalPrediction, confidenceInterval, monthName, insights, methodology, weeklyPattern } = data as any;

    const trendPercent = categories.length > 0
        ? categories.reduce((sum: number, c: any) => sum + (c.trend || 0), 0) / categories.length
        : 0;
    const isUpTrend = trendPercent > 0;

    return (
        <div className="min-h-screen bg-background pb-32 md:pb-8">
            {/* Header */}
            <div className="sticky top-0 z-20 glass-nav border-b">
                <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
                    <Link href="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
                        <ArrowLeft className="w-5 h-5 text-foreground" />
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <h1 className="text-sm font-semibold text-foreground tracking-tight">Análisis IA</h1>
                    </div>
                    <div className="w-9" />
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-5 py-8 space-y-6">

                {/* === HERO INSIGHTS === */}
                <div className="relative overflow-hidden rounded-3xl glass-card p-6 md:p-8">
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-violet-500/5 to-transparent" />
                    <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />

                    <div className="relative z-10">
                        <div className="mb-5 flex items-center justify-between gap-3">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                                <Sparkles className="h-3 w-3" />
                                Resumen IA · {monthName}
                            </span>
                            {methodology && (
                                <span className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground">
                                    <Info className="h-3 w-3" />
                                    {methodology}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-end justify-between gap-6">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Gasto previsto este mes</p>
                                <h2 className="text-5xl md:text-6xl font-semibold tracking-tight tabular-nums text-foreground">
                                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalPrediction)}
                                </h2>
                                {confidenceInterval && (
                                    <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                                        Rango estimado: {new Intl.NumberFormat('es-ES').format(confidenceInterval.low)}€ – {new Intl.NumberFormat('es-ES').format(confidenceInterval.high)}€
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <div className="rounded-2xl border border-border bg-card/60 px-4 py-3 text-center">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tendencia</p>
                                    <p className={`flex items-center justify-center gap-1 text-xl font-semibold tabular-nums ${isUpTrend ? 'text-accent-500 dark:text-accent-400' : 'text-secondary-500 dark:text-secondary-400'}`}>
                                        {isUpTrend ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                        {isUpTrend ? '+' : ''}{trendPercent.toFixed(1)}%
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-border bg-card/60 px-4 py-3 text-center">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Categorías</p>
                                    <p className="text-xl font-semibold tabular-nums text-foreground">{categories.length}</p>
                                </div>
                            </div>
                        </div>

                        {/* Puntos clave del resumen ejecutivo */}
                        {insights && insights.length > 0 && (
                            <ul className="mt-6 space-y-2 border-t border-border/60 pt-5">
                                {insights.slice(0, 2).map((insight: string, idx: number) => (
                                    <li key={`hero-insight-${idx}`} className="flex items-start gap-2.5 text-sm text-foreground/90">
                                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                                        <span className="leading-relaxed">{insight}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* === ALERTAS DE GASTO === */}
                {insights && insights.length > 2 && (
                    <div className="space-y-3">
                        <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recomendaciones</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {insights.slice(2).map((insight: string, idx: number) => (
                                <div
                                    key={`insight-${idx}`}
                                    className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft transition-colors hover:border-primary/30"
                                >
                                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                    </div>
                                    <p className="text-sm font-medium leading-relaxed text-foreground/90">{insight}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* === VISUALIZACIÓN DE TENDENCIAS === */}
                <TrendsChart categories={categories} weeklyPattern={weeklyPattern} />

                {/* === DESGLOSE POR CATEGORÍA === */}
                <div className="space-y-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Desglose por categoría</h3>

                    {categories.length === 0 ? (
                        <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border">
                            <Brain className="w-12 h-12 text-muted-foreground/60 mx-auto mb-3" />
                            <p className="text-muted-foreground font-medium">No hay suficientes datos para predecir.</p>
                            <p className="text-muted-foreground text-sm mt-1">Añade más transacciones para ver predicciones.</p>
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
