import Link from 'next/link';
import { Sparkles, PieChart, Calendar, Target } from 'lucide-react';

export default function QuickActions() {
    const actions = [
        { href: '/dashboard/analisis', icon: Sparkles, label: 'IA', color: 'text-amber-500' },
        { href: '/dashboard/estadisticas', icon: PieChart, label: 'Stats', color: 'text-indigo-500' },
        { href: '/dashboard/suscripciones', icon: Calendar, label: 'Subs', color: 'text-rose-500' },
        { href: '/dashboard/presupuestos', icon: Target, label: 'Budget', color: 'text-emerald-500' },
    ];

    return (
        <div className="flex items-center justify-between gap-2">
            {actions.map((action) => (
                <Link
                    key={action.href}
                    href={action.href}
                    className="flex-1 flex flex-col items-center gap-1.5 py-3 bg-white rounded-xl border border-neutral-100 hover:border-neutral-200 hover:shadow-sm transition-all active:scale-95"
                >
                    <action.icon className={`w-5 h-5 ${action.color}`} />
                    <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">{action.label}</span>
                </Link>
            ))}
        </div>
    );
}
