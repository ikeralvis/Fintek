'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Calendar,
    Settings,
    Plus,
    Bell,
    TrendingUp,
    CreditCard,
    CalendarDays
} from 'lucide-react';
import { format, parseISO, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import SubscriptionCalendar from './SubscriptionCalendar';

const MOCK_LOGOS: Record<string, string> = {
    'Netflix': 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg',
    'Spotify': 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg',
    'Amazon Prime': 'https://upload.wikimedia.org/wikipedia/commons/4/41/Amazon_Prime_logo.svg',
    'Youtube': 'https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg',
    'Apple One': 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',
    'iCloud': 'https://upload.wikimedia.org/wikipedia/commons/d/d4/ICloud_logo.svg',
    'Disney+': 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg',
    'ChatGPT': 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg'
};

const FREQUENCY_STYLES: Record<string, string> = {
    'monthly': 'text-[#F97316] bg-orange-50 ring-1 ring-orange-100', // Orange
    'yearly': 'text-[#3B82F6] bg-blue-50 ring-1 ring-blue-100',     // Blue
    'weekly': 'text-[#10B981] bg-emerald-50 ring-1 ring-emerald-100', // Green
    'bi-weekly': 'text-[#10B981] bg-emerald-50 ring-1 ring-emerald-100'
};

const FREQUENCY_LABELS: Record<string, string> = {
    'monthly': 'Mensual',
    'yearly': 'Anual',
    'weekly': 'Semanal',
    'bi-weekly': 'Quincenal'
};

export default function SubscriptionsView({ subscriptions, monthlyTotal }: any) {
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

    // Filter upcoming (Logic: simple sort by date for now)
    const upcoming = [...subscriptions].sort((a, b) => new Date(a.next_payment_date).getTime() - new Date(b.next_payment_date).getTime());

    // Stats
    const countThisMonth = subscriptions.filter((s: any) =>
        isSameMonth(parseISO(s.next_payment_date), new Date())
    ).reduce((acc: number, s: any) => acc + s.amount, 0);

    // Render Calendar if mode is calendar
    if (viewMode === 'calendar') {
        return <SubscriptionCalendar subscriptions={subscriptions} onClose={() => setViewMode('list')} />;
    }

    return (
        <div className="min-h-screen bg-neutral-50 pb-32">

            {/* 1. Header & Summary Card */}
            <div className="bg-white rounded-b-[40px] shadow-sm px-6 pt-6 pb-10 sticky top-0 z-20">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Pagos Recurrentes</h1>
                    <div className="flex items-center gap-3">
                        {/* Calendar Toggle */}
                        <button
                            onClick={() => setViewMode('calendar')}
                            className="p-2.5 rounded-full hover:bg-neutral-50 transition-colors border border-neutral-100"
                        >
                            <CalendarDays className="w-5 h-5 text-neutral-600" />
                        </button>

                        {/* Add Button */}
                        <Link
                            href="/dashboard/suscripciones/nuevo"
                            className="p-2.5 bg-neutral-900 rounded-full text-white hover:bg-neutral-800 transition-colors shadow-lg shadow-neutral-900/20 active:scale-90"
                        >
                            <Plus className="w-5 h-5" strokeWidth={2.5} />
                        </Link>
                    </div>
                </div>

                {/* Summary Card */}
                <div className="bg-white rounded-[32px] p-6 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.08)] border border-neutral-100 flex items-center divide-x divide-neutral-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50 rounded-full blur-2xl -mr-10 -mt-10 opacity-50"></div>

                    <div className="flex-1 pr-6 relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-indigo-50 rounded-lg">
                                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                            </div>
                            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide">Este mes</span>
                        </div>
                        <p className="text-2xl font-black text-neutral-900 tracking-tight">
                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(countThisMonth)}
                        </p>
                    </div>
                    <div className="flex-1 pl-6 relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-blue-50 rounded-lg">
                                <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                            </div>
                            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide">Media mes</span>
                        </div>
                        <p className="text-2xl font-black text-neutral-900 tracking-tight">
                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(monthlyTotal)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 mt-8 space-y-10">

                {/* 2. Upcoming Section */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-neutral-900">Próximos Pagos</h2>
                    <div className="space-y-4">
                        {upcoming.length > 0 ? upcoming.slice(0, 3).map((sub: any, i: number) => (
                            <SubscriptionItem key={sub.id} sub={sub} index={i} />
                        )) : (
                            <div className="p-6 bg-white rounded-3xl border border-dashed border-neutral-200 text-center">
                                <p className="text-sm font-bold text-neutral-400">Todo pagado por ahora 🎉</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. All Subscriptions */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-neutral-900">Todas las Suscripciones</h2>
                        <button className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors">
                            VER TODAS
                        </button>
                    </div>

                    <div className="space-y-4 pb-20">
                        {subscriptions.map((sub: any, i: number) => (
                            <SubscriptionItem key={sub.id} sub={sub} index={i} showBadge />
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}

function SubscriptionItem({ sub, index, showBadge = false }: any) {
    const defaultLogo = 'https://ui-avatars.com/api/?background=f5f5f5&color=404040&bold=true&name=' + encodeURIComponent(sub.name);

    // Simple logo matcher
    const logoKey = Object.keys(MOCK_LOGOS).find(k => sub.name.toLowerCase().includes(k.toLowerCase()));
    const logo = sub.logo_url || (logoKey ? MOCK_LOGOS[logoKey] : defaultLogo);

    return (
        <div
            className="group flex items-center justify-between bg-white p-4 pr-5 rounded-[24px] shadow-sm border border-neutral-100 hover:border-neutral-300 transition-all cursor-pointer active:scale-[0.98]"
            style={{ animation: `slideUp 0.5s ease-out ${index * 0.1}s backwards` }}
        >
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-[18px] flex items-center justify-center bg-white shadow-sm border border-neutral-100 p-2 relative group-hover:scale-110 transition-transform">
                    <img src={logo} alt={sub.name} className="w-full h-full object-contain rounded-lg" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-neutral-900 group-hover:text-indigo-600 transition-colors">{sub.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[11px] text-neutral-400 font-semibold tracking-tight">
                            Renueva el {format(parseISO(sub.next_payment_date), "d MMM", { locale: es })}
                        </p>
                        {showBadge && (
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${FREQUENCY_STYLES[sub.billing_cycle]}`}>
                                {FREQUENCY_LABELS[sub.billing_cycle]}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <div className="text-right">
                <p className="text-base font-black text-neutral-900">{sub.amount}€</p>
            </div>
        </div>
    );
}
