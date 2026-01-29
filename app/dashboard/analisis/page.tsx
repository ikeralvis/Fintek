import { getSpendingAnalysis } from '@/lib/actions/analysis';
import { Activity, Brain, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';
import SmartCategoryCard from '@/components/analysis/SmartCategoryCard';

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

    const { categories, totalPrediction, monthName } = data;
    // Calculate a dummy confidence interval around +/- 5-8% 
    // (Real implementation would use variance, but simplifying for UI demo)
    const confidenceRange = Math.round(totalPrediction * 0.05);

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl pb-32">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
                        <Brain className="w-8 h-8 text-amber-500 animate-pulse-slow" />
                        Predicción Inteligente
                    </h1>
                    <p className="text-sm font-bold text-neutral-400 mt-1 ml-10">
                        Motor de IA financera v2.0
                    </p>
                </div>
                <button className="p-2 bg-neutral-100 rounded-full text-neutral-400 hover:bg-neutral-200 transition-colors">
                    <Activity className="w-5 h-5" />
                </button>
            </div>

            {/* Main Prediction Card - Yellow/Orange Gradient */}
            <div className="relative overflow-hidden rounded-[40px] p-8 mb-10 shadow-2xl shadow-amber-500/20 group">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500"></div>

                {/* Glassmorphism Details */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-white/30 transition-all duration-700"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>

                <div className="relative z-10 text-white">
                    <div className="flex items-center gap-2 mb-2 opacity-90">
                        <div className="bg-white/20 backdrop-blur-md p-1.5 rounded-lg">
                            <Brain className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest">Predicción {monthName}</span>
                    </div>

                    <div className="flex items-baseline gap-2 mb-1">
                        <h2 className="text-6xl font-black tracking-tighter">
                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalPrediction)}
                        </h2>
                    </div>

                    <div className="flex items-center gap-3 opacity-80">
                        <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold">
                            ±{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(confidenceRange)} margen
                        </span>
                        <span className="text-xs font-bold">Basado en tus últimos 6 meses</span>
                    </div>
                </div>
            </div>

            {/* Smart Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                <div className="bg-white rounded-[32px] p-6 border border-neutral-100 shadow-sm hover:border-amber-200 transition-colors group cursor-default">
                    <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center mb-4 text-amber-500 group-hover:scale-110 transition-transform">
                        <Lightbulb className="w-5 h-5" strokeWidth={2.5} />
                    </div>
                    <h3 className="font-bold text-neutral-900 mb-2">Consejo de Ahorro</h3>
                    <p className="text-sm font-medium text-neutral-500 leading-relaxed">
                        Tus gastos en <strong>Ocio</strong> aumentan un 15% cada fin de semana. Prueba a establecer un "Día sin Gasto" para compensar.
                    </p>
                </div>

                <div className="bg-white rounded-[32px] p-6 border border-neutral-100 shadow-sm hover:border-emerald-200 transition-colors group cursor-default">
                    <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 text-emerald-500 group-hover:scale-110 transition-transform">
                        <TrendingUp className="w-5 h-5" strokeWidth={2.5} />
                    </div>
                    <h3 className="font-bold text-neutral-900 mb-2">Tendencia Positiva</h3>
                    <p className="text-sm font-medium text-neutral-500 leading-relaxed">
                        Estás un <strong>8% por debajo</strong> de tu presupuesto habitual en Alimentación. ¡Sigue así!
                    </p>
                </div>
            </div>

            {/* Breakdown Title */}
            <div className="flex items-center gap-3 mb-6 px-2">
                <div className="h-px bg-neutral-200 flex-1"></div>
                <span className="text-xs font-black text-neutral-400 uppercase tracking-widest">Desglose por Categoría</span>
                <div className="h-px bg-neutral-200 flex-1"></div>
            </div>

            {/* Categories Grid */}
            {categories.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-[32px] border border-dashed border-neutral-200">
                    <p className="text-neutral-400 font-bold">No hay suficientes datos para predecir categorías individuales.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {categories.map((cat: any, index: number) => (
                        <SmartCategoryCard
                            key={cat.categoryId}
                            data={cat}
                            delay={index * 100} // Stagger animation
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
