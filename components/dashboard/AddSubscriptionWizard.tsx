'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Monitor,
    Briefcase,
    DollarSign,
    Heart,
    Gamepad2,
    Grid,
    CheckCircle2,
    Calendar as CalendarIcon,
    Plus,
    CreditCard
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const CATEGORIES = [
    { id: 'entertainment', name: 'Entretenimiento', icon: Monitor },
    { id: 'productivity', name: 'Productividad', icon: Briefcase },
    { id: 'finance', name: 'Finanzas', icon: DollarSign },
    { id: 'health', name: 'Salud', icon: Heart },
    { id: 'gaming', name: 'Gaming', icon: Gamepad2 },
    { id: 'other', name: 'Otros', icon: Grid },
];

const POPULAR_PLATFORMS = [
    { id: 'netflix', name: 'Netflix', category: 'entertainment', icon: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg' },
    { id: 'spotify', name: 'Spotify', category: 'entertainment', icon: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg' },
    { id: 'apple_tv', name: 'Apple TV+', category: 'entertainment', icon: 'https://upload.wikimedia.org/wikipedia/commons/2/28/Apple_TV_Plus_Logo.svg' },
    { id: 'youtube', name: 'YouTube Premium', category: 'entertainment', icon: 'https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg' },
    { id: 'chatgpt', name: 'ChatGPT Pro', category: 'productivity', icon: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg' },
    { id: 'dropbox', name: 'Dropbox', category: 'productivity', icon: 'https://upload.wikimedia.org/wikipedia/commons/7/78/Dropbox_Icon.svg' },
    { id: 'adobe', name: 'Adobe CC', category: 'productivity', icon: 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Creative_Cloud.svg' },
    { id: 'amazon', name: 'Amazon Prime', category: 'entertainment', icon: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Amazon_Prime_logo.svg' },
];

export default function AddSubscriptionWizard({ accounts, categories }: any) {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedPlatform, setSelectedPlatform] = useState<any | null>(null);
    const [customName, setCustomName] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        amount: '',
        billing_cycle: 'monthly',
        start_date: new Date().toISOString().split('T')[0],
        account_id: accounts[0]?.id || '',
        category_id: categories[0]?.id || ''
    });
    const [loading, setLoading] = useState(false);

    const handlePlatformSelect = (platform: any) => {
        setSelectedPlatform(platform);
        setCustomName(platform ? platform.name : '');
        setStep(2);
    };

    const handleCustomSelect = () => {
        setSelectedPlatform(null);
        setCustomName('');
        setStep(2);
    };

    const handleCreate = async () => {
        if (!processName()) return;

        setLoading(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        const nameToSave = selectedPlatform ? selectedPlatform.name : customName;
        const logoToSave = selectedPlatform ? selectedPlatform.icon : null;

        const { error } = await supabase.from('subscriptions').insert({
            user_id: user.id,
            name: nameToSave,
            amount: parseFloat(formData.amount),
            currency: 'EUR',
            billing_cycle: formData.billing_cycle,
            next_payment_date: formData.start_date,
            logo_url: logoToSave,
            status: 'active',
            category_id: formData.category_id || null,
            account_id: formData.account_id || null
        });

        if (error) {
            console.error(error);
            alert('Error al crear suscripción');
            setLoading(false);
        } else {
            router.push('/dashboard/suscripciones');
            router.refresh();
        }
    };

    const processName = () => {
        return selectedPlatform || customName.length > 0;
    };

    // Filter platforms based on category selection
    const displayedPlatforms = selectedCategory
        ? POPULAR_PLATFORMS.filter(p => p.category === selectedCategory)
        : POPULAR_PLATFORMS;

    // Group accounts by Bank
    const accountsByBank = accounts.reduce((acc: any, account: any) => {
        const bankName = account.banks?.name || 'Otros';
        if (!acc[bankName]) acc[bankName] = [];
        acc[bankName].push(account);
        return acc;
    }, {});

    return (
        <div className="min-h-screen bg-neutral-50 pb-40"> {/* pb-40 ensures space for fixed button */}
            {/* Header */}
            <div className="bg-white px-4 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <button onClick={() => step === 1 ? router.back() : setStep(1)} className="p-2 rounded-full hover:bg-neutral-50 text-neutral-900 transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-base font-bold text-neutral-900">Agregar pago</h1>
                <div className="w-10"></div>
            </div>

            {step === 1 ? (
                /* STEP 1: SELECTION */
                <div className="container mx-auto px-6 pt-8 space-y-10 animate-fade-in text-neutral-900">

                    {/* Removed Search Bar as requested */}

                    {/* Categories */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-neutral-900">Categorías</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                                    className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${selectedCategory === cat.id
                                            ? 'bg-neutral-900 text-white border-neutral-900 shadow-md transform scale-[1.02]'
                                            : 'bg-white text-neutral-600 border-neutral-100 hover:border-neutral-200 shadow-sm'
                                        }`}
                                >
                                    <cat.icon className="w-5 h-5" />
                                    <span className="text-sm font-bold">{cat.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Popular Platforms */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold text-neutral-900">
                                {selectedCategory ? 'Resultados' : 'Plataformas Populares'}
                            </h2>
                            <button
                                onClick={handleCustomSelect}
                                className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full"
                            >
                                + Otro
                            </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {displayedPlatforms.map(platform => (
                                <button
                                    key={platform.id}
                                    onClick={() => handlePlatformSelect(platform)}
                                    className="bg-white p-6 rounded-[24px] border border-neutral-100 shadow-sm hover:shadow-md hover:border-neutral-200 transition-all flex flex-col items-center gap-4 group"
                                >
                                    <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-neutral-50 p-2 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <img src={platform.icon} alt={platform.name} className="w-full h-full object-contain" />
                                    </div>
                                    <div className="text-center space-y-1">
                                        <h3 className="text-sm font-bold text-neutral-900">{platform.name}</h3>
                                        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">Disponible</span>
                                    </div>
                                </button>
                            ))}

                            {/* Custom Card in Grid */}
                            <button
                                onClick={handleCustomSelect}
                                className="bg-neutral-50 p-6 rounded-[24px] border border-dashed border-neutral-300 hover:bg-neutral-100 transition-all flex flex-col items-center justify-center gap-4 group"
                            >
                                <div className="w-14 h-14 rounded-2xl bg-neutral-200 p-2 flex items-center justify-center">
                                    <Plus className="w-6 h-6 text-neutral-500" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-sm font-bold text-neutral-500">Personalizado</h3>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                /* STEP 2: FORM DETAILS */
                <div className="container mx-auto px-6 pt-8 space-y-6 animate-slide-up">
                    <div className="flex flex-col items-center mb-6">
                        {selectedPlatform ? (
                            <div className="w-24 h-24 rounded-[32px] bg-white shadow-lg border border-neutral-100 p-4 mb-4 flex items-center justify-center">
                                <img src={selectedPlatform.icon} alt={selectedPlatform.name} className="w-full h-full object-contain" />
                            </div>
                        ) : (
                            <div className="w-24 h-24 rounded-[32px] bg-neutral-100 shadow-inner border border-neutral-200 p-4 mb-4 flex items-center justify-center">
                                <CreditCard className="w-10 h-10 text-neutral-400" />
                            </div>
                        )}

                        {selectedPlatform ? (
                            <h2 className="text-2xl font-black text-neutral-900">{selectedPlatform.name}</h2>
                        ) : (
                            <input
                                type="text"
                                placeholder="Nombre del servicio"
                                value={customName}
                                onChange={(e) => setCustomName(e.target.value)}
                                className="text-2xl font-black text-center bg-transparent border-b-2 border-neutral-200 focus:border-neutral-900 outline-none pb-2 w-full max-w-xs placeholder:text-neutral-300"
                                autoFocus
                            />
                        )}
                        <p className="text-sm text-neutral-400 font-bold mt-1">Configuración de pago</p>
                    </div>

                    <div className="bg-white rounded-[32px] p-6 shadow-sm border border-neutral-100 space-y-8">

                        {/* Amount - Big Input */}
                        <div>
                            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Monto de renovación</label>
                            <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-neutral-400">€</span>
                                <input
                                    type="number"
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                    className="w-full bg-neutral-50 rounded-[24px] py-6 pl-12 pr-6 text-4xl font-black text-neutral-900 focus:outline-none focus:ring-4 focus:ring-neutral-100 transition-all text-center"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        {/* Frequency */}
                        <div>
                            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Frecuencia</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['monthly', 'yearly', 'weekly', 'bi-weekly'].map(cycle => (
                                    <button
                                        key={cycle}
                                        onClick={() => setFormData({ ...formData, billing_cycle: cycle })}
                                        className={`py-3 rounded-xl text-xs font-bold transition-all border ${formData.billing_cycle === cycle
                                                ? 'bg-neutral-900 text-white border-neutral-900 shadow-md'
                                                : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                                            }`}
                                    >
                                        {cycle === 'monthly' ? 'Mensual' : cycle === 'yearly' ? 'Anual' : cycle === 'weekly' ? 'Semanal' : 'Quincenal'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Date - Styled Picker (Fixed duplicated icon) */}
                        <div>
                            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Primer Pago</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={formData.start_date}
                                    onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                    className="w-full bg-white border border-neutral-200 rounded-2xl p-4 font-bold text-neutral-900 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none h-14 pr-12"
                                    style={{
                                        // This hides the default icon if possible, or we just rely on the custom one.
                                        // But safer to just position icon with pointer-events-none over it.
                                    }}
                                />
                                {/* Custom icon aligned right, pointer events none so click goes through to input */}
                                <CalendarIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Custom Account Selector - Cards - GROUPED & GRID */}
                        <div>
                            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Cuenta de cargo</label>

                            <div className="space-y-4">
                                {Object.entries(accountsByBank).map(([bankName, bankAccounts]: [string, any]) => (
                                    <div key={bankName}>
                                        <h3 className="text-xs font-bold text-neutral-400 mb-2 pl-1">{bankName}</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {bankAccounts.map((acc: any) => (
                                                <div
                                                    key={acc.id}
                                                    onClick={() => setFormData({ ...formData, account_id: acc.id })}
                                                    className={`p-4 rounded-2xl border cursor-pointer flex flex-col justify-between h-28 relative transition-all ${formData.account_id === acc.id
                                                            ? 'bg-neutral-900 border-neutral-900 shadow-lg scale-[1.02]'
                                                            : 'bg-white border-neutral-100 hover:border-neutral-300 hover:shadow-sm'
                                                        }`}
                                                >
                                                    {formData.account_id === acc.id && (
                                                        <div className="absolute top-2 right-2">
                                                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                                        </div>
                                                    )}

                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${formData.account_id === acc.id ? 'bg-white/10' : 'bg-neutral-100'}`}>
                                                        <CreditCard className={`w-4 h-4 ${formData.account_id === acc.id ? 'text-white' : 'text-neutral-500'}`} />
                                                    </div>

                                                    <div>
                                                        <p className={`text-xs font-bold truncate ${formData.account_id === acc.id ? 'text-white' : 'text-neutral-900'}`}>{acc.name}</p>
                                                        <p className={`text-[10px] mt-0.5 ${formData.account_id === acc.id ? 'text-neutral-400' : 'text-neutral-500'}`}>
                                                            {acc.current_balance}€
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Continue Button - Ensure Z-index and visibility */}
            {step === 2 && (
                <div className="fixed bottom-6 left-0 right-0 px-6 z-50">
                    <button
                        onClick={handleCreate}
                        disabled={loading || !formData.amount || (!selectedPlatform && !customName)}
                        className="w-full bg-neutral-900 text-white font-bold text-lg py-4 rounded-2xl shadow-2xl shadow-neutral-900/30 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? 'Guardando...' : `Guardar Suscripción`}
                        {!loading && <CheckCircle2 className="w-5 h-5" />}
                    </button>
                </div>
            )}
        </div>
    );
}
