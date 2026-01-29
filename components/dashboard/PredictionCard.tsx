import { Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getSpendingAnalysis } from '@/lib/actions/analysis';

export default async function PredictionCard() {
    const { data } = await getSpendingAnalysis();
    
    const currentMonth = new Date();
    const monthName = currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    
    // Use real prediction data or fallback
    const totalPrediction = data?.totalPrediction || 0;
    const displayAmount = totalPrediction > 0 
        ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalPrediction)
        : '---';

    return (
        <Link href="/dashboard/analisis">
            <div className="w-full relative overflow-hidden rounded-[24px] bg-gradient-to-br from-amber-200 via-orange-300 to-orange-400 p-6 shadow-lg shadow-orange-200/50 mb-10 group cursor-pointer">
                {/* Glow effects */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/40 transition-colors"></div>

                <div className="relative z-10 flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-orange-900/80">
                            <Sparkles className="w-5 h-5" />
                            <span className="text-xs font-bold uppercase tracking-wider">Predicción IA</span>
                        </div>

                        <h3 className="text-2xl font-bold text-neutral-900 leading-tight mb-2">
                            Predicción para {monthName}
                        </h3>

                        <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-sm font-medium text-neutral-800">Gasto estimado:</span>
                            <span className="text-3xl font-black text-neutral-900">{displayAmount}</span>
                        </div>

                        <p className="text-xs font-medium text-orange-900/70">
                            Basado en tus últimos 6 meses de actividad
                        </p>
                    </div>

                    <div className="bg-white/30 p-2 rounded-full backdrop-blur-sm group-hover:bg-white/50 transition-colors">
                        <ArrowRight className="w-6 h-6 text-neutral-900" />
                    </div>
                </div>
            </div>
        </Link>
    );
}
