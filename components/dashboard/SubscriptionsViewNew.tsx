'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    Plus, Calendar, TrendingUp, Trash2,
    MoreVertical, Pause, Play, CalendarDays
} from 'lucide-react';
import { format, parseISO, isSameMonth, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { deleteSubscription, updateSubscription } from '@/lib/actions/subscriptions';
import SubscriptionCalendar from './SubscriptionCalendar';

const SERVICE_LOGOS: Record<string, string> = {
    'netflix': 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg',
    'spotify': 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg',
    'amazon': 'https://upload.wikimedia.org/wikipedia/commons/4/41/Amazon_Prime_logo.svg',
    'youtube': 'https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg',
    'apple': 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',
    'icloud': 'https://upload.wikimedia.org/wikipedia/commons/d/d4/ICloud_logo.svg',
    'disney': 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg',
    'hbo': 'https://upload.wikimedia.org/wikipedia/commons/1/17/HBO_Max_Logo.svg',
    'max': 'https://upload.wikimedia.org/wikipedia/commons/1/17/HBO_Max_Logo.svg',
    'chatgpt': 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg',
    'openai': 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg',
    'microsoft': 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg',
    'xbox': 'https://upload.wikimedia.org/wikipedia/commons/f/f9/Xbox_one_logo.svg',
    'playstation': 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Playstation_logo_colour.svg',
    'twitch': 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Twitch_Glitch_Logo_Purple.svg',
    'github': 'https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg',
    'notion': 'https://upload.wikimedia.org/wikipedia/commons/e/e9/Notion-logo.svg',
    'figma': 'https://upload.wikimedia.org/wikipedia/commons/3/33/Figma-logo.svg',
    'google': 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg',
    'crunchyroll': 'https://upload.wikimedia.org/wikipedia/commons/0/08/Crunchyroll_Logo.png',
    'dazn': 'https://upload.wikimedia.org/wikipedia/commons/a/a2/DAZN_logo.svg',
};

const FREQUENCY_LABELS: Record<string, string> = {
    'monthly': 'mes',
    'yearly': 'año',
    'weekly': 'semana',
    'bi-weekly': 'quincena'
};

function getLogo(name: string, logoUrl?: string): string | null {
    if (logoUrl) return logoUrl;
    const lowerName = name.toLowerCase();
    for (const [key, url] of Object.entries(SERVICE_LOGOS)) {
        if (lowerName.includes(key)) return url;
    }
    return null;
}

function getInitials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
}

export default function SubscriptionsViewNew({ subscriptions, monthlyTotal }: any) {
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [menuOpen, setMenuOpen] = useState<string | null>(null);

    const activeSubscriptions = subscriptions.filter((s: any) => s.status === 'active');
    const pausedSubscriptions = subscriptions.filter((s: any) => s.status === 'paused');

    const thisMonthTotal = activeSubscriptions
        .filter((s: any) => isSameMonth(parseISO(s.next_payment_date), new Date()))
        .reduce((acc: number, s: any) => acc + Number(s.amount), 0);

    // Sort by next payment date
    const sortedSubs = [...activeSubscriptions].sort(
        (a, b) => new Date(a.next_payment_date).getTime() - new Date(b.next_payment_date).getTime()
    );

    const handleDelete = async (id: string) => {
        if (confirm('¿Eliminar esta suscripción?')) {
            await deleteSubscription(id);
        }
        setMenuOpen(null);
    };

    const handlePause = async (id: string, currentStatus: string) => {
        await updateSubscription(id, { 
            status: currentStatus === 'active' ? 'paused' : 'active' 
        });
        setMenuOpen(null);
    };

    if (viewMode === 'calendar') {
        return <SubscriptionCalendar subscriptions={subscriptions} onClose={() => setViewMode('list')} />;
    }

    return (
        <div className="min-h-screen bg-neutral-50 pb-32">
            {/* Header */}
            <div className="bg-white px-5 pt-6 pb-8 border-b border-neutral-100">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-xl font-bold text-neutral-900">Suscripciones</h1>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setViewMode('calendar')}
                            className="p-2.5 rounded-xl hover:bg-neutral-100 transition-colors border border-neutral-200"
                        >
                            <CalendarDays className="w-5 h-5 text-neutral-600" />
                        </button>
                        <Link
                            href="/dashboard/suscripciones/nuevo"
                            className="p-2.5 bg-neutral-900 rounded-xl text-white hover:bg-neutral-800 transition-colors shadow-lg"
                        >
                            <Plus className="w-5 h-5" strokeWidth={2.5} />
                        </Link>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-4 text-white">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 opacity-70" />
                            <span className="text-xs font-medium opacity-70">Este mes</span>
                        </div>
                        <p className="text-2xl font-black">
                            {thisMonthTotal.toFixed(2)}€
                        </p>
                    </div>
                    <div className="bg-white border border-neutral-200 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-neutral-400" />
                            <span className="text-xs font-medium text-neutral-400">Media mensual</span>
                        </div>
                        <p className="text-2xl font-black text-neutral-900">
                            {monthlyTotal.toFixed(2)}€
                        </p>
                    </div>
                </div>
            </div>

            <div className="px-5 py-6 space-y-6">
                {/* Active Subscriptions */}
                {sortedSubs.length > 0 ? (
                    <div className="space-y-3">
                        {sortedSubs.map((sub: any) => {
                            const logo = getLogo(sub.name, sub.logo_url);
                            const daysUntil = differenceInDays(parseISO(sub.next_payment_date), new Date());
                            const isUpcoming = daysUntil >= 0 && daysUntil <= 7;
                            
                            return (
                                <div
                                    key={sub.id}
                                    className={`bg-white rounded-2xl p-4 border transition-all ${
                                        isUpcoming ? 'border-amber-200 bg-amber-50/30' : 'border-neutral-100'
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Logo */}
                                        <div className="w-12 h-12 rounded-xl bg-white border border-neutral-100 shadow-sm flex items-center justify-center overflow-hidden">
                                            {logo ? (
                                                <img src={logo} alt={sub.name} className="w-8 h-8 object-contain" />
                                            ) : (
                                                <span className="text-sm font-black text-neutral-400">
                                                    {getInitials(sub.name)}
                                                </span>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-neutral-900 truncate">{sub.name}</h3>
                                                {isUpcoming && (
                                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">
                                                        {daysUntil === 0 ? 'Hoy' : `${daysUntil}d`}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-neutral-500">
                                                {format(parseISO(sub.next_payment_date), "d 'de' MMMM", { locale: es })} · {FREQUENCY_LABELS[sub.billing_cycle] || 'mes'}
                                            </p>
                                        </div>

                                        {/* Amount */}
                                        <div className="text-right">
                                            <p className="font-black text-neutral-900">{Number(sub.amount).toFixed(2)}€</p>
                                        </div>

                                        {/* Menu */}
                                        <div className="relative">
                                            <button
                                                onClick={() => setMenuOpen(menuOpen === sub.id ? null : sub.id)}
                                                className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
                                            >
                                                <MoreVertical className="w-4 h-4 text-neutral-400" />
                                            </button>
                                            
                                            {menuOpen === sub.id && (
                                                <div className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg py-1 z-10 min-w-[140px]">
                                                    <button
                                                        onClick={() => handlePause(sub.id, sub.status)}
                                                        className="w-full px-4 py-2 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                                                    >
                                                        <Pause className="w-4 h-4" />
                                                        Pausar
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(sub.id)}
                                                        className="w-full px-4 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Eliminar
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-neutral-200">
                        <Calendar className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                        <h3 className="font-bold text-neutral-900 mb-1">Sin suscripciones</h3>
                        <p className="text-sm text-neutral-500 mb-4">Añade tus servicios de pago recurrente</p>
                        <Link
                            href="/dashboard/suscripciones/nuevo"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-xl text-sm font-bold"
                        >
                            <Plus className="w-4 h-4" />
                            Añadir suscripción
                        </Link>
                    </div>
                )}

                {/* Paused Subscriptions */}
                {pausedSubscriptions.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wide">Pausadas</h2>
                        {pausedSubscriptions.map((sub: any) => {
                            const logo = getLogo(sub.name, sub.logo_url);
                            
                            return (
                                <div
                                    key={sub.id}
                                    className="bg-white rounded-2xl p-4 border border-neutral-100 opacity-60"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center overflow-hidden">
                                            {logo ? (
                                                <img src={logo} alt={sub.name} className="w-8 h-8 object-contain grayscale" />
                                            ) : (
                                                <span className="text-sm font-black text-neutral-400">
                                                    {getInitials(sub.name)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-neutral-700">{sub.name}</h3>
                                            <p className="text-xs text-neutral-400">Pausada</p>
                                        </div>
                                        <button
                                            onClick={() => handlePause(sub.id, sub.status)}
                                            className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
                                        >
                                            <Play className="w-4 h-4 text-emerald-600" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
