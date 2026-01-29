import { createClient } from '@/lib/supabase/server';
import { ArrowLeft, Filter, Wallet, CreditCard } from 'lucide-react';
import Link from 'next/link';
import CreateAccountForm from '@/components/dashboard/CreateAccountForm';

// Server Component - No 'use client'
export default async function AccountsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // 1. Fetch Accounts + Banks (only active accounts)
    const { data: accountsData } = await supabase
        .from('accounts')
        .select(`
            *,
            banks (name, color, logo_url)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    const accounts = accountsData || [];

    // 2. Fetch Banks List for the create form
    const { data: banksList } = await supabase
        .from('banks')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

    // 3. Fetch Income/Expense stats for ALL accounts in one efficient query 
    // instead of N+1 requests. Exclude transfers from stats.
    const now = new Date();
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

    const { data: transactions } = await supabase
        .from('transactions')
        .select('account_id, type, amount')
        .eq('user_id', user.id)
        .not('type', 'eq', 'transfer') // Exclude transfers from stats
        .gte('transaction_date', firstDayOfYear);

    // Calculate aggregated stats in memory
    const statsByAccount: Record<string, { income: number; expense: number }> = {};

    (transactions || []).forEach(t => {
        if (!statsByAccount[t.account_id]) {
            statsByAccount[t.account_id] = { income: 0, expense: 0 };
        }
        if (t.type === 'income') statsByAccount[t.account_id].income += t.amount;
        else if (t.type === 'expense') statsByAccount[t.account_id].expense += t.amount;
    });

    // Merge data
    const enhancedAccounts = accounts.map(acc => ({
        ...acc,
        yearlyIncome: statsByAccount[acc.id]?.income || 0,
        yearlyExpense: statsByAccount[acc.id]?.expense || 0,
        // Ensure bank data is accessible consistently
        bankName: acc.banks?.name || 'Otros',
        bankColor: acc.banks?.color || '#000000'
    }));

    // Group by Bank
    const groupedAccounts = enhancedAccounts.reduce((groups: any, account) => {
        const bankName = account.bankName;
        if (!groups[bankName]) groups[bankName] = [];
        groups[bankName].push(account);
        return groups;
    }, {});


    const totalBalance = enhancedAccounts.reduce((sum, acc) => sum + acc.current_balance, 0);

    return (
        <div className="container mx-auto px-4 pb-24 pt-6 max-w-2xl bg-neutral-50 min-h-screen">

            {/* Header */}
            <div className="flex items-center justify-between mb-8 sticky top-0 z-10 bg-neutral-50/80 backdrop-blur-md py-4 -mx-4 px-4">
                <Link href="/dashboard" className="p-2 rounded-full hover:bg-neutral-200 transition-colors">
                    <ArrowLeft className="w-6 h-6 text-neutral-900" />
                </Link>
                <h1 className="text-xl font-bold text-neutral-900">Mis Cuentas</h1>
                <div className="flex items-center gap-2">
                    <button className="p-2 rounded-full hover:bg-neutral-200 transition-colors">
                        <Filter className="w-6 h-6 text-neutral-900" />
                    </button>
                    {/* The + button requested in header can be implemented by a client component wrapper or keeping it simple for now */}
                </div>
            </div>

            {/* Total Balance Card */}
            <div className="bg-neutral-900 rounded-[32px] p-8 mb-8 text-center text-white shadow-xl shadow-neutral-900/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10">
                    <p className="text-sm font-medium text-neutral-400 mb-2 uppercase tracking-wider">Balance Total</p>
                    <h2 className="text-[40px] leading-tight font-black tracking-tight mb-2">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalBalance)}
                    </h2>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-neutral-300">
                        <span>{enhancedAccounts.length} Cuentas activas</span>
                    </div>
                </div>
            </div>

            {/* Create Account Wrapper */}
            <div className="mb-8">
                <CreateAccountForm banks={banksList || []} />
            </div>

            {/* Grouped Accounts List */}
            <div className="space-y-8">
                {Object.entries(groupedAccounts).map(([bankName, bankAccounts]: [string, any]) => {
                    const bankColor = bankAccounts[0].bankColor;

                    return (
                        <div key={bankName}>
                            <h3 className="text-lg font-bold text-neutral-900 mb-4 px-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: bankColor }}></span>
                                {bankName}
                            </h3>
                            <div className="space-y-4">
                                {bankAccounts.map((acc: any) => (
                                    <div key={acc.id} className="relative bg-white rounded-3xl p-5 shadow-sm border border-neutral-100 overflow-hidden group hover:shadow-md transition-shadow">

                                        {/* Link covering the entire card to Detail Page */}
                                        <Link href={`/dashboard/cuentas/${acc.id}`} className="absolute inset-0 z-10" aria-label={`Ver detalles de ${acc.name}`}></Link>

                                        <div className="relative z-0">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-4">
                                                    <div
                                                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm overflow-hidden"
                                                        style={{ backgroundColor: acc.banks?.logo_url ? 'transparent' : bankColor }}
                                                    >
                                                        {acc.banks?.logo_url ? (
                                                            <img src={acc.banks.logo_url} alt={acc.banks.name} className="w-full h-full object-contain" />
                                                        ) : (
                                                            acc.type === 'cash' ? <Wallet className="w-6 h-6" /> : <CreditCard className="w-6 h-6" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-bold text-neutral-900 text-lg">{acc.name}</h4>
                                                            {/* Favorite Star (Visual placeholder until interactive) */}
                                                            {acc.is_favorite && <span className="text-amber-400 text-xs">★</span>}
                                                        </div>
                                                        <p className="text-sm text-neutral-400 capitalize">{acc.type === 'wallet' ? 'Efectivo' : 'Cuenta Bancaria'}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xl font-bold text-neutral-900">
                                                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(acc.current_balance)}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Stats Row */}
                                            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-neutral-50">
                                                <div>
                                                    <p className="text-xs text-neutral-400 mb-1">Ingresos (Año)</p>
                                                    <p className="text-sm font-bold text-green-600">
                                                        +{new Intl.NumberFormat('es-ES', { style: 'decimal', minimumFractionDigits: 0 }).format(acc.yearlyIncome || 0)}€
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-neutral-400 mb-1">Gastos (Año)</p>
                                                    <p className="text-sm font-bold text-red-500">
                                                        -{new Intl.NumberFormat('es-ES', { style: 'decimal', minimumFractionDigits: 0 }).format(acc.yearlyExpense || 0)}€
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Colored accent line at bottom */}
                                        <div className="absolute bottom-0 left-0 right-0 h-1 opacity-20" style={{ backgroundColor: bankColor }}></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}

                {enhancedAccounts.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-neutral-400">No tienes cuentas registradas.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
