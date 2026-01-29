import { createClient } from '@/lib/supabase/server';
import { ArrowLeft, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import CreateAccountButton from '@/components/dashboard/CreateAccountButton';

export default async function AccountsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // Fetch Accounts + Banks
    const { data: accountsData } = await supabase
        .from('accounts')
        .select(`*, banks (name, color, logo_url)`)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    const accounts = accountsData || [];

    // Fetch Banks for the create form
    const { data: banksList } = await supabase
        .from('banks')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

    // Fetch yearly stats
    const firstDayOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString();
    const { data: transactions } = await supabase
        .from('transactions')
        .select('account_id, type, amount')
        .eq('user_id', user.id)
        .not('type', 'eq', 'transfer')
        .gte('transaction_date', firstDayOfYear);

    // Calculate stats
    const statsByAccount: Record<string, { income: number; expense: number }> = {};
    (transactions || []).forEach(t => {
        if (!statsByAccount[t.account_id]) {
            statsByAccount[t.account_id] = { income: 0, expense: 0 };
        }
        if (t.type === 'income') statsByAccount[t.account_id].income += t.amount;
        else if (t.type === 'expense') statsByAccount[t.account_id].expense += t.amount;
    });

    const enhancedAccounts = accounts.map(acc => ({
        ...acc,
        yearlyIncome: statsByAccount[acc.id]?.income || 0,
        yearlyExpense: statsByAccount[acc.id]?.expense || 0,
        bankName: acc.banks?.name || 'Otros',
        bankColor: acc.banks?.color || '#6B7280'
    }));

    // Group by Bank
    const groupedAccounts = enhancedAccounts.reduce((groups: Record<string, typeof enhancedAccounts>, account) => {
        const bankName = account.bankName;
        if (!groups[bankName]) groups[bankName] = [];
        groups[bankName].push(account);
        return groups;
    }, {});

    const totalBalance = enhancedAccounts.reduce((sum, acc) => sum + acc.current_balance, 0);

    const formatCurrency = (amount: number) => 
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);

    const formatNumber = (amount: number) => 
        new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(amount);

    return (
        <div className="min-h-screen bg-neutral-50 pb-32">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-neutral-50/80 backdrop-blur-xl px-5 py-4">
                <div className="flex items-center justify-between">
                    <Link href="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-neutral-100 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-neutral-700" />
                    </Link>
                    <h1 className="text-lg font-semibold text-neutral-900">Mis Cuentas</h1>
                    <CreateAccountButton banks={banksList || []} />
                </div>
            </div>

            <div className="px-5 space-y-5">
                {/* Balance Card */}
                <div className="bg-neutral-900 rounded-2xl p-5 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                    <div className="relative">
                        <p className="text-xs text-neutral-400 font-medium uppercase tracking-wide mb-1">Balance Total</p>
                        <p className="text-3xl font-bold tracking-tight">{formatCurrency(totalBalance)}</p>
                        <p className="text-xs text-neutral-500 mt-2">{enhancedAccounts.length} cuenta{enhancedAccounts.length !== 1 ? 's' : ''} activa{enhancedAccounts.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>

                {/* Accounts List */}
                <div className="space-y-5">
                    {Object.entries(groupedAccounts).map(([bankName, bankAccounts]) => (
                        <div key={bankName}>
                            {/* Bank Header */}
                            <div className="flex items-center gap-2 mb-2 ml-1">
                                <div 
                                    className="w-2 h-2 rounded-full" 
                                    style={{ backgroundColor: bankAccounts[0].bankColor }} 
                                />
                                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">{bankName}</span>
                            </div>

                            {/* Account Cards */}
                            <div className="space-y-2">
                                {bankAccounts.map((acc) => (
                                    <Link
                                        key={acc.id}
                                        href={`/dashboard/cuentas/${acc.id}`}
                                        className="block bg-white rounded-xl p-4 border border-neutral-100 hover:border-neutral-200 transition-all"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {/* Icon */}
                                                <div
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden"
                                                    style={{ backgroundColor: acc.banks?.logo_url ? 'transparent' : acc.bankColor }}
                                                >
                                                    {acc.banks?.logo_url ? (
                                                        <img src={acc.banks.logo_url} alt="" className="w-full h-full object-contain" />
                                                    ) : (
                                                        <span className="text-white text-xs font-bold">
                                                            {acc.bankName.substring(0, 2).toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>
                                                {/* Name & Type */}
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <h3 className="font-semibold text-neutral-900">{acc.name}</h3>
                                                        {acc.is_favorite && <span className="text-amber-400 text-xs">★</span>}
                                                    </div>
                                                    <p className="text-xs text-neutral-400 capitalize">
                                                        {acc.type === 'checking' ? 'Corriente' : 
                                                         acc.type === 'savings' ? 'Ahorro' : 
                                                         acc.type === 'investment' ? 'Inversión' : acc.type}
                                                    </p>
                                                </div>
                                            </div>
                                            {/* Balance */}
                                            <p className="font-bold text-neutral-900">{formatCurrency(acc.current_balance)}</p>
                                        </div>

                                        {/* Stats */}
                                        {(acc.yearlyIncome > 0 || acc.yearlyExpense > 0) && (
                                            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-neutral-50">
                                                <div className="flex items-center gap-1.5 text-xs">
                                                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                                                    <span className="text-emerald-600 font-medium">+{formatNumber(acc.yearlyIncome)}€</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs">
                                                    <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                                                    <span className="text-red-500 font-medium">-{formatNumber(acc.yearlyExpense)}€</span>
                                                </div>
                                            </div>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Empty State */}
                    {enhancedAccounts.length === 0 && (
                        <div className="text-center py-16">
                            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Wallet className="w-8 h-8 text-neutral-400" />
                            </div>
                            <p className="text-neutral-500 font-medium mb-1">No tienes cuentas</p>
                            <p className="text-sm text-neutral-400">Pulsa + para crear tu primera cuenta</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
