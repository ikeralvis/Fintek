'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Wallet as WalletIcon,
    Plus,
    Minus,
    ArrowLeft,
    History,
    Home as HouseIcon,
    Gift,
    Coffee,
    ShoppingBag,
    Check,
    Trash2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/client';

type Props = {
    account: any;
    initialTransactions: any[];
};

const WALLET_CATEGORIES = [
    { id: 'casa', name: 'Dinero de Casa', icon: HouseIcon, color: 'bg-blue-500' },
    { id: 'paga', name: 'Paga', icon: Gift, color: 'bg-purple-500' },
    { id: 'comida', name: 'Comida/Café', icon: Coffee, color: 'bg-amber-500' },
    { id: 'compras', name: 'Compras', icon: ShoppingBag, color: 'bg-rose-500' },
];

const QUICK_AMOUNTS = [5, 10, 20, 50];

export default function WalletView({ account, initialTransactions }: Props) {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [amount, setAmount] = useState<number | null>(null);
    const [selectedCat, setSelectedCat] = useState(WALLET_CATEGORIES[0]);
    const [transactions, setTransactions] = useState(initialTransactions);
    const [currentBalance, setCurrentBalance] = useState(account.current_balance);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDeleteTransaction = async (tx: any) => {
        if (!confirm('¿Eliminar este movimiento?')) return;
        
        setDeletingId(tx.id);
        try {
            // Delete transaction
            // El trigger de la BD actualiza el balance automáticamente
            const { error: delError } = await supabase
                .from('transactions')
                .delete()
                .eq('id', tx.id);
            
            if (delError) throw delError;

            // Update local state
            setTransactions(transactions.filter(t => t.id !== tx.id));
            router.refresh();
        } catch (err) {
            console.error('Error deleting transaction:', err);
            alert('Error al eliminar el movimiento');
        } finally {
            setDeletingId(null);
        }
    };

    const handleTransaction = async (type: 'income' | 'expense', customAmount?: number) => {
        const finalAmount = customAmount || amount;
        if (!finalAmount || finalAmount <= 0) return;

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user');

            // 1. Create Transaction
            // NOTE: We do NOT join 'categories' here because wallet transactions 
            // use hardcoded categories (stored in description) rather than DB relations.
            const { data: newTx, error: txError } = await supabase
                .from('transactions')
                .insert([{
                    user_id: user.id,
                    account_id: account.id,
                    amount: finalAmount,
                    type,
                    description: selectedCat.name, // Use wallet-specific category as description
                    transaction_date: new Date().toISOString()
                }])
                .select('*') // REMOVED: categories(...) join to prevent error 'column does not exist'
                .single();

            if (txError) throw txError;

            // 2. Update Balance
            const newBalance = type === 'income'
                ? currentBalance + finalAmount
                : currentBalance - finalAmount;

            const { error: accError } = await supabase
                .from('accounts')
                .update({ current_balance: newBalance })
                .eq('id', account.id);

            if (accError) throw accError;

            // Update local state
            setCurrentBalance(newBalance);
            setTransactions([newTx, ...transactions]);
            setAmount(null);
            router.refresh();
        } catch (err) {
            console.error('Error in wallet transaction:', err);
            alert('Error al procesar la operación');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50 pb-40">
            {/* Header */}
            <div className="bg-white sticky top-0 z-20 px-4 py-3 flex items-center justify-between border-b border-neutral-100">
                <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-neutral-50 transition-colors text-neutral-900">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-base font-bold text-neutral-900">Mi Cartera (Efectivo)</h1>
                <div className="w-10"></div>
            </div>

            <div className="container mx-auto px-4 pt-8 max-w-2xl space-y-8">
                {/* Main Balance Card */}
                <div className="bg-neutral-900 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden text-center">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                    <div className="relative z-10 space-y-2">
                        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                            <WalletIcon className="w-8 h-8 text-emerald-400" />
                        </div>
                        <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Saldo en Efectivo</p>
                        <h2 className="text-5xl font-black tracking-tight">
                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(currentBalance)}
                        </h2>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-[32px] p-6 border border-neutral-100 shadow-sm space-y-4">
                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center">Sumar</p>
                        <div className="grid grid-cols-2 gap-2">
                            {QUICK_AMOUNTS.map(a => (
                                <button
                                    key={`add-${a}`}
                                    onClick={() => handleTransaction('income', a)}
                                    disabled={loading}
                                    className="py-3 rounded-2xl bg-emerald-50 text-emerald-600 font-bold text-sm hover:bg-emerald-100 active:scale-95 transition-all"
                                >
                                    +{a}€
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-[32px] p-6 border border-neutral-100 shadow-sm space-y-4">
                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center">Restar</p>
                        <div className="grid grid-cols-2 gap-2">
                            {QUICK_AMOUNTS.map(a => (
                                <button
                                    key={`sub-${a}`}
                                    onClick={() => handleTransaction('expense', a)}
                                    disabled={loading}
                                    className="py-3 rounded-2xl bg-rose-50 text-rose-600 font-bold text-sm hover:bg-rose-100 active:scale-95 transition-all"
                                >
                                    -{a}€
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Categories */}
                <div className="space-y-4">
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-2">Categoría Especial</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {WALLET_CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCat(cat)}
                                className={`p-4 rounded-[28px] border transition-all flex flex-col items-center gap-2 ${selectedCat.id === cat.id
                                    ? 'border-neutral-900 bg-neutral-900 text-white shadow-lg'
                                    : 'border-neutral-100 bg-white hover:border-neutral-200'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedCat.id === cat.id ? 'bg-white/20' : cat.color + ' text-white'
                                    }`}>
                                    <cat.icon className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-bold text-center leading-tight">{cat.name}</span>
                                {selectedCat.id === cat.id && <Check className="w-3 h-3 text-emerald-400" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Recent Wallet History */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 ml-2">
                        <History className="w-4 h-4 text-neutral-400" />
                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Movimientos de Cartera</p>
                    </div>

                    <div className="bg-white rounded-[32px] border border-neutral-100 shadow-sm overflow-hidden divide-y divide-neutral-50 text-sm">
                        {transactions.length > 0 ? (
                            transactions.map(tx => (
                                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                            {tx.type === 'income' ? <Plus className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-neutral-900">{tx.description}</p>
                                            <p className="text-[10px] text-neutral-400 font-medium">
                                                {format(parseISO(tx.transaction_date), "d MMM yyyy", { locale: es })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <p className={`font-black ${tx.type === 'income' ? 'text-emerald-500' : 'text-neutral-900'}`}>
                                            {tx.type === 'income' ? '+' : '-'}{tx.amount}€
                                        </p>
                                        <button
                                            onClick={() => handleDeleteTransaction(tx)}
                                            disabled={deletingId === tx.id}
                                            className="p-2 text-neutral-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-10 text-center">
                                <p className="text-neutral-300 text-xs font-bold uppercase tracking-widest">Sin movimientos</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
