'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, Plus, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function WalletWidget({ walletAccount }: { walletAccount: any }) {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState<number | null>(null);

    if (!walletAccount) return null;

    const handleQuickAdd = async (amount: number) => {
        setLoading(amount);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Add Transaction
            await supabase.from('transactions').insert([{
                user_id: user.id,
                account_id: walletAccount.id,
                amount: amount,
                type: 'income',
                description: 'Recarga Rápida',
                category_id: null, // or a specific category ID if we knew it
                transaction_date: new Date().toISOString()
            }]);

            // Update Balance
            await supabase.from('accounts').update({
                current_balance: walletAccount.current_balance + amount
            }).eq('id', walletAccount.id);

            router.refresh();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="bg-neutral-900 rounded-[32px] p-6 text-white shadow-xl mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

            <div className="relative z-10 flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md">
                        <Wallet className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg leading-none">Mi Cartera</h3>
                        <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mt-1">Efectivo</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-black tracking-tight">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(walletAccount.current_balance)}
                    </p>
                </div>
            </div>

            <div className="relative z-10 bg-white/10 rounded-2xl p-3 mb-4 flex items-center justify-between backdrop-blur-sm">
                <span className="text-xs font-bold text-white/50 uppercase ml-2 tracking-widest">Añadir</span>
                <div className="flex gap-2">
                    {[5, 10, 20, 50].map(amount => (
                        <button
                            key={amount}
                            onClick={() => handleQuickAdd(amount)}
                            disabled={loading !== null}
                            className="bg-white text-neutral-900 h-9 min-w-[36px] px-2 rounded-lg font-bold text-xs hover:bg-emerald-400 hover:text-white transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center"
                        >
                            {loading === amount ? '...' : `+${amount}`}
                        </button>
                    ))}
                </div>
            </div>

            <Link href="/dashboard/cartera" className="absolute bottom-4 left-6 text-[10px] text-white/30 hover:text-white transition-colors flex items-center gap-1 font-bold tracking-widest uppercase">
                Ver detalle <ChevronRight className="w-3 h-3" />
            </Link>
        </div>
    );
}
