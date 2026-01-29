import Link from 'next/link';
import { Sparkles, PieChart, Calendar, Target } from 'lucide-react';

export default function QuickActions() {
    return (
        <div className="flex items-center justify-between gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide px-1">
            <Link
                href="/dashboard/analisis"
                className="flex flex-col items-center gap-2 min-w-[75px] group"
            >
                <div className="w-14 h-14 rounded-2xl bg-white border border-neutral-100 shadow-sm flex items-center justify-center group-hover:scale-105 transition-all group-active:scale-95">
                    <Sparkles className="w-6 h-6 text-amber-500" />
                </div>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-tighter">IA</span>
            </Link>

            <Link
                href="/dashboard/estadisticas"
                className="flex flex-col items-center gap-2 min-w-[75px] group"
            >
                <div className="w-14 h-14 rounded-2xl bg-white border border-neutral-100 shadow-sm flex items-center justify-center group-hover:scale-105 transition-all group-active:scale-95">
                    <PieChart className="w-6 h-6 text-indigo-500" />
                </div>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-tighter">Estadísticas</span>
            </Link>

            <Link
                href="/dashboard/suscripciones"
                className="flex flex-col items-center gap-2 min-w-[75px] group"
            >
                <div className="w-14 h-14 rounded-2xl bg-white border border-neutral-100 shadow-sm flex items-center justify-center group-hover:scale-105 transition-all group-active:scale-95">
                    <Calendar className="w-6 h-6 text-rose-500" />
                </div>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-tighter">Suscripción</span>
            </Link>

            <Link
                href="/dashboard/presupuestos"
                className="flex flex-col items-center gap-2 min-w-[75px] group"
            >
                <div className="w-14 h-14 rounded-2xl bg-white border border-neutral-100 shadow-sm flex items-center justify-center group-hover:scale-105 transition-all group-active:scale-95">
                    <Target className="w-6 h-6 text-emerald-500" />
                </div>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-tighter">Presupuestos</span>
            </Link>
        </div>
    );
}
