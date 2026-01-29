import { getSpendingAnalysis } from '@/lib/actions/analysis';
import { Brain, AlertTriangle, ArrowLeft, Info } from 'lucide-react';
import SmartCategoryCard from '@/components/analysis/SmartCategoryCard';
import Link from 'next/link';

export default async function AnalysisPage() {
    const { data, error } = await getSpendingAnalysis();

    if (error || !data) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="bg-rose-50 text-rose-600 p-6 rounded-3xl border border-rose-100 flex items-center gap-4">
                    <AlertTriangle className="w-6 h-6" />
                    <span className="font-bold">No se pudieron cargar las predicciones. Inténtalo más tarde.</span>
                </div>
            </div>
        );
    }

    const { categories, totalPrediction, confidenceInterval, monthName, insights, methodology } = data;

    return (
        <div className="min-h-screen bg-neutral-50 pb-32">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-neutral-50/80 backdrop-blur-xl px-5 py-4">
                <div className="flex items-center justify-between">
                    <Link href="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-neutral-100 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-neutral-700" />
                    </Link>
                    <h1 className="text-lg font-semibold text-neutral-900">Predicción Inteligente</h1>
                    <div className="w-9" />
                </div>
            </div>

            <div className="px-5 space-y-6 max-w-2xl mx-auto">
                {/* Main Prediction Card */}
                <div className="relative overflow-hidden rounded-3xl p-6 shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500"></div>
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    
                    <div className="relative z-10 text-white">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="bg-white/20 backdrop-blur-md p-1.5 rounded-lg">
                                <Brain className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider opacity-90">Predicción {monthName}</span>
                        </div>

                        <h2 className="text-4xl font-black tracking-tight mb-2">
                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalPrediction)}
                        </h2>

                        {confidenceInterval && (
                            <div className="flex flex-wrap items-center gap-2 text-xs opacity-80">
                                <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full font-semibold">
                                    Rango: {new Intl.NumberFormat('es-ES').format(confidenceInterval.low)}€ - {new Intl.NumberFormat('es-ES').format(confidenceInterval.high)}€
                                </span>
                                <span className="font-medium">Basado en 12 meses</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Methodology Badge */}
                {methodology && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl text-xs">
                        <Info className="w-4 h-4 text-blue-500" />
                        <span className="text-blue-700 font-medium">{methodology}</span>
                    </div>
                )}

                {/* Dynamic Insights */}
                {insights && insights.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wide px-1">Insights Personalizados</h3>
                        <div className="space-y-2">
                            {insights.map((insight: string, idx: number) => (
                                <div 
                                    key={`insight-${idx}`}
                                    className="bg-white rounded-2xl p-4 border border-neutral-100 shadow-sm"
                                >
                                    <p className="text-sm text-neutral-700 font-medium leading-relaxed">{insight}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Category Breakdown */}
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wide px-1">Desglose por Categoría</h3>
                    
                    {categories.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-neutral-200">
                            <Brain className="w-12 h-12 text-neutral-200 mx-auto mb-3" />
                            <p className="text-neutral-400 font-medium">No hay suficientes datos para predecir.</p>
                            <p className="text-neutral-300 text-sm mt-1">Añade más transacciones para ver predicciones.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
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
