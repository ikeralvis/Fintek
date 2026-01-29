'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, CreditCard, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { createSubscription } from '@/lib/actions/subscriptions';

const POPULAR_SERVICES = [
    { name: 'Netflix', amount: 12.99, color: '#E50914' },
    { name: 'Spotify', amount: 10.99, color: '#1DB954' },
    { name: 'Amazon Prime', amount: 4.99, color: '#00A8E1' },
    { name: 'Disney+', amount: 8.99, color: '#113CCF' },
    { name: 'HBO Max', amount: 9.99, color: '#5822B4' },
    { name: 'YouTube Premium', amount: 11.99, color: '#FF0000' },
    { name: 'Apple One', amount: 19.95, color: '#000000' },
    { name: 'ChatGPT Plus', amount: 20, color: '#10A37F' },
    { name: 'iCloud+', amount: 2.99, color: '#3693F3' },
    { name: 'Xbox Game Pass', amount: 12.99, color: '#107C10' },
];

export default function SimpleSubscriptionForm() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
    
    const [formData, setFormData] = useState({
        name: '',
        amount: '',
        billingCycle: 'monthly' as 'monthly' | 'yearly' | 'weekly',
        nextPaymentDate: nextMonth.toISOString().split('T')[0],
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await createSubscription({
            name: formData.name,
            amount: Number.parseFloat(formData.amount),
            billingCycle: formData.billingCycle,
            nextPaymentDate: formData.nextPaymentDate,
        });

        if (result.error) {
            setError(result.error);
            setLoading(false);
        } else {
            router.push('/dashboard/suscripciones');
        }
    };

    const selectService = (service: typeof POPULAR_SERVICES[0]) => {
        setFormData(prev => ({
            ...prev,
            name: service.name,
            amount: service.amount.toString(),
        }));
    };

    return (
        <div className="min-h-screen bg-neutral-50 pb-32">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-neutral-50/80 backdrop-blur-xl px-5 py-4">
                <div className="flex items-center justify-between">
                    <Link href="/dashboard/suscripciones" className="p-2 -ml-2 rounded-xl hover:bg-neutral-100 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-neutral-700" />
                    </Link>
                    <h1 className="text-lg font-semibold text-neutral-900">Nueva Suscripción</h1>
                    <div className="w-9" />
                </div>
            </div>

            <form onSubmit={handleSubmit} className="px-5 space-y-6 max-w-lg mx-auto">
                {error && (
                    <div className="bg-rose-50 text-rose-600 px-4 py-3 rounded-2xl text-sm font-medium">
                        {error}
                    </div>
                )}

                {/* Quick Select Popular Services */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-medium text-neutral-500">Servicios populares</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                        {POPULAR_SERVICES.slice(0, 6).map((service) => (
                            <button
                                key={service.name}
                                type="button"
                                onClick={() => selectService(service)}
                                className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                                    formData.name === service.name 
                                        ? 'bg-neutral-900 text-white border-neutral-900' 
                                        : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-300'
                                }`}
                            >
                                {service.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Name */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-500">Nombre del servicio</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Netflix, Spotify, Gimnasio..."
                        className="w-full bg-white border border-neutral-200 rounded-2xl px-4 py-3.5 text-neutral-900 font-medium placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                        required
                    />
                </div>

                {/* Amount - Big Input */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-500">Importe</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-neutral-400">€</span>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.amount}
                            onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                            placeholder="0.00"
                            className="w-full bg-white border border-neutral-200 rounded-2xl pl-12 pr-4 py-4 text-3xl font-bold text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                            required
                        />
                    </div>
                </div>

                {/* Frequency */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-500">Frecuencia</label>
                    <div className="grid grid-cols-3 gap-2">
                        {(['monthly', 'yearly', 'weekly'] as const).map((freq) => (
                            <button
                                key={freq}
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, billingCycle: freq }))}
                                className={`py-3 rounded-xl font-semibold text-sm transition-all ${
                                    formData.billingCycle === freq 
                                        ? 'bg-neutral-900 text-white' 
                                        : 'bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-300'
                                }`}
                            >
                                {freq === 'monthly' ? 'Mensual' : freq === 'yearly' ? 'Anual' : 'Semanal'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Next Payment Date */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-neutral-500">
                        <Calendar className="w-4 h-4" />
                        Próximo cobro
                    </label>
                    <input
                        type="date"
                        value={formData.nextPaymentDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, nextPaymentDate: e.target.value }))}
                        className="w-full bg-white border border-neutral-200 rounded-2xl px-4 py-3.5 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                        required
                    />
                </div>

                {/* Preview Card */}
                {formData.name && formData.amount && (
                    <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-3xl p-5 text-white">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                    <CreditCard className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold">{formData.name}</h3>
                                    <p className="text-xs text-neutral-400">
                                        {formData.billingCycle === 'monthly' ? 'Mensual' : formData.billingCycle === 'yearly' ? 'Anual' : 'Semanal'}
                                    </p>
                                </div>
                            </div>
                            <p className="text-2xl font-black">{parseFloat(formData.amount || '0').toFixed(2)}€</p>
                        </div>
                        <div className="text-xs text-neutral-400">
                            Próximo cobro: {new Date(formData.nextPaymentDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                    </div>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={loading || !formData.name || !formData.amount}
                    className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold text-lg shadow-lg shadow-neutral-900/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
                >
                    {loading ? 'Guardando...' : 'Añadir Suscripción'}
                </button>
            </form>
        </div>
    );
}
