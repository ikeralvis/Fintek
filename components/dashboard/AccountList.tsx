'use client';

import Link from 'next/link';
import { ChevronRight, Wallet as WalletIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';

type Account = {
    id: string;
    name: string;
    type: string;
    current_balance: number;
    banks?: {
        name: string;
        color: string;
        logo_url?: string;
    } | null;
    is_favorite: boolean;
};

export default function AccountList({ accounts }: { accounts: Account[] }) {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState<string | null>(null);

    const favoriteAccounts = accounts.filter(a => a.is_favorite);

    const handleQuickAdd = async (e: React.MouseEvent, accId: string, amount: number, currentBalance: number) => {
        e.preventDefault();
        e.stopPropagation();
        setLoading(accId);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            await supabase.from('transactions').insert([{
                user_id: user.id,
                account_id: accId,
                amount,
                type: 'income',
                description: 'Añadir Efectivo',
                transaction_date: new Date().toISOString()
            }]);
            await supabase.from('accounts').update({ current_balance: currentBalance + amount }).eq('id', accId);
            router.refresh();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-lg font-bold text-neutral-900">Cuentas Favoritas</h2>
                <Link href="/dashboard/cuentas" className="text-sm font-bold text-blue-600 flex items-center gap-1 hover:text-blue-700">
                    Ver todas <ChevronRight className="w-4 h-4" />
                </Link>
            </div>

            {favoriteAccounts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {favoriteAccounts.map(acc => {
                        const isWallet = acc.type === 'wallet';
                        const color = acc.banks?.color || (isWallet ? '#10b981' : '#1a1a1a');

                        return (
                            <Link
                                key={acc.id}
                                href={isWallet ? `/dashboard/cartera` : `/dashboard/cuentas/${acc.id}`}
                                className="relative overflow-hidden rounded-2xl p-4 text-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                                style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)` }}
                            >
                                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center overflow-hidden">
                                            {acc.banks?.logo_url ? (
                                                <img src={acc.banks.logo_url} alt="" className="w-6 h-6 object-contain" />
                                            ) : isWallet ? (
                                                <WalletIcon className="w-4 h-4" />
                                            ) : (
                                                <span className="text-xs font-bold">{acc.banks?.name?.substring(0, 2).toUpperCase() || '€'}</span>
                                            )}
                                        </div>
                                    </div>

                                    <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider mb-0.5 truncate">
                                        {acc.banks?.name || (isWallet ? 'Cartera' : 'Cuenta')}
                                    </p>
                                    <p className="text-xs font-medium text-white/80 truncate mb-2">{acc.name}</p>
                                    <p className="text-xl font-black">
                                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(acc.current_balance)}
                                    </p>
                                </div>

                                {isWallet && (
                                    <div className="absolute top-2 right-2 flex gap-1 z-10">
                                        <button
                                            onClick={(e) => handleQuickAdd(e, acc.id, 5, acc.current_balance)}
                                            className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[9px] font-bold hover:bg-white/30"
                                        >
                                            +5
                                        </button>
                                        <button
                                            onClick={(e) => handleQuickAdd(e, acc.id, 10, acc.current_balance)}
                                            className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[9px] font-bold hover:bg-white/30"
                                        >
                                            +10
                                        </button>
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-2xl p-6 text-center border border-dashed border-neutral-200">
                    <p className="text-neutral-400 text-sm">Marca cuentas como favoritas para verlas aquí</p>
                </div>
            )}
        </div>
    );
}
