import Link from 'next/link';
import { Sparkles, PieChart, Calendar, Target } from 'lucide-react';

export default function QuickActions() {
    const actions = [
        { href: '/dashboard/analisis', icon: Sparkles, label: 'Predicción', color: 'text-amber-500' },
        { href: '/dashboard/estadisticas', icon: PieChart, label: 'Estadísticas', color: 'text-primary' },
        { href: '/dashboard/suscripciones', icon: Calendar, label: 'Suscripciones', color: 'text-rose-500' },
        { href: '/dashboard/presupuestos', icon: Target, label: 'Presupuestos', color: 'text-emerald-500' },
    ];

    return (
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            {actions.map((action) => (
                <Link
                    key={action.href}
                    href={action.href}
                    className="min-w-0 flex flex-col items-center gap-1.5 px-1 py-3 bg-card rounded-xl border border-border hover:border-border hover:shadow-sm transition-all active:scale-95"
                >
                    <action.icon className={`w-5 h-5 shrink-0 ${action.color}`} />
                    <span className="w-full text-center text-[9.5px] sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-normal leading-tight break-words hyphens-auto">
                        {action.label}
                    </span>
                </Link>
            ))}
        </div>
    );
}
