'use client';

import Link from 'next/link';
import { ChevronRight, Wallet as WalletIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';
import { toast } from 'sonner';

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
            // El trigger de la BD actualiza el balance automáticamente
            const { error } = await supabase.from('transactions').insert([{
                user_id: user.id,
                account_id: accId,
                amount,
                type: 'income',
                description: 'Añadir Efectivo',
                transaction_date: new Date().toISOString()
            }]);
            if (error) throw error;
            router.refresh();
        } catch (err) {
            console.error(err);
            toast.error('No se pudo añadir el efectivo');
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Cuentas Favoritas</h2>
                <Link href="/dashboard/cuentas" className="text-xs font-semibold text-muted-foreground flex items-center gap-0.5 hover:text-foreground transition-colors">
                    Ver todas <ChevronRight className="w-3.5 h-3.5" />
                </Link>
            </div>

            {favoriteAccounts.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                    {favoriteAccounts.map(acc => {
                        const isWallet = acc.type === 'wallet';
                        const color = acc.banks?.color || (isWallet ? '#10b981' : '#4f46e5');
                        const isLoading = loading === acc.id;

                        return (
                            <Link
                                key={acc.id}
                                href={isWallet ? `/dashboard/cartera` : `/dashboard/cuentas/${acc.id}`}
                                className="glass-card relative overflow-hidden rounded-2xl p-4 transition-all hover:shadow-medium active:scale-[0.98]"
                            >
                                <div className="mb-3 flex items-center gap-2">
                                    <div
                                        className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg"
                                        style={{ backgroundColor: `${color}1A`, color }}
                                    >
                                        {acc.banks?.logo_url ? (
                                            <img src={acc.banks.logo_url} alt="" className="h-5 w-5 object-contain" />
                                        ) : isWallet ? (
                                            <WalletIcon className="h-4 w-4" />
                                        ) : (
                                            <span className="text-[10px] font-bold">{acc.banks?.name?.substring(0, 2).toUpperCase() || '€'}</span>
                                        )}
                                    </div>
                                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                                </div>

                                <p className="mb-0.5 truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                    {acc.banks?.name || (isWallet ? 'Cartera' : 'Cuenta')}
                                </p>
                                <p className="text-lg font-semibold tracking-tight tabular-nums text-foreground">
                                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(acc.current_balance)}
                                </p>

                                {isWallet && (
                                    <div className="absolute top-3 right-3 z-10 flex gap-1">
                                        <button
                                            onClick={(e) => handleQuickAdd(e, acc.id, 5, acc.current_balance)}
                                            disabled={isLoading}
                                            className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-foreground transition-colors hover:bg-muted/70 disabled:opacity-50"
                                        >
                                            +5
                                        </button>
                                        <button
                                            onClick={(e) => handleQuickAdd(e, acc.id, 10, acc.current_balance)}
                                            disabled={isLoading}
                                            className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-foreground transition-colors hover:bg-muted/70 disabled:opacity-50"
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
                <div className="glass-card rounded-2xl p-6 text-center">
                    <p className="text-sm text-muted-foreground">Marca cuentas como favoritas</p>
                </div>
            )}
        </div>
    );
}
