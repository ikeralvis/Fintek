import Link from 'next/link';
import { Sparkles, PieChart, Calendar, Target } from 'lucide-react';

export default function QuickActions() {
    const actions = [
        { href: '/dashboard/analisis', icon: Sparkles, label: 'Predicción', color: 'text-amber-500' },
        { href: '/dashboard/estadisticas', icon: PieChart, label: 'Estadísticas', color: 'text-primary' },
        { href: '/dashboard/suscripciones', icon: Calendar, label: 'Suscrip.', color: 'text-rose-500' },
        { href: '/dashboard/presupuestos', icon: Target, label: 'Presup.', color: 'text-emerald-500' },
    ];

    return (
        <div className="flex items-center justify-between gap-2">
            {actions.map((action) => (
                <Link
                    key={action.href}
                    href={action.href}
                    className="flex-1 flex flex-col items-center gap-1.5 py-3 bg-card rounded-xl border border-border hover:border-border hover:shadow-sm transition-all active:scale-95"
                >
                    <action.icon className={`w-5 h-5 ${action.color}`} />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{action.label}</span>
                </Link>
            ))}
        </div>
    );
}
