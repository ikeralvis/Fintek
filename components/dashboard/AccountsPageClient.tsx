'use client';

import { useMemo } from 'react';
import { useDashboard } from '@/lib/DashboardContext';
import { ArrowLeft, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import CreateAccountButton from './CreateAccountButton';

type Bank = {
    id: string;
    name: string;
    color?: string;
    logo_url?: string;
};

export default function AccountsPageClient({ banks }: { readonly banks: Bank[] }) {
    const { accounts, transactions } = useDashboard();

    const { groupedAccounts, totalBalance } = useMemo(() => {
        const firstDayOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString();

        const yearTx = transactions.filter(t => t.transaction_date >= firstDayOfYear);
        const statsByAccount: Record<string, { income: number; expense: number }> = {};

        yearTx.forEach(t => {
            if (!statsByAccount[t.account_id]) {
                statsByAccount[t.account_id] = { income: 0, expense: 0 };
            }
            if (t.type === 'income') statsByAccount[t.account_id].income += t.amount;
            else if (t.type === 'expense') statsByAccount[t.account_id].expense += t.amount;
        });

        const enhanced = accounts.map(acc => ({
            ...acc,
            yearlyIncome: statsByAccount[acc.id]?.income || 0,
            yearlyExpense: statsByAccount[acc.id]?.expense || 0,
            bankName: acc.banks?.name || 'Otros',
            bankColor: acc.banks?.color || '#6B7280',
        }));

        const grouped = enhanced.reduce((groups: Record<string, typeof enhanced>, account) => {
            const bankName = account.bankName;
            if (!groups[bankName]) groups[bankName] = [];
            groups[bankName].push(account);
            return groups;
        }, {});

        const totalBalance = enhanced.reduce((sum, acc) => sum + acc.current_balance, 0);

        return { groupedAccounts: grouped, totalBalance };
    }, [accounts, transactions]);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);

    const formatNumber = (amount: number) =>
        new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(amount);

    return (
        <div className="min-h-screen bg-neutral-50 pb-32 md:pb-8">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-neutral-50/80 backdrop-blur-xl border-b border-neutral-100 px-5 py-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <Link href="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-neutral-100 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-neutral-700" />
                    </Link>
                    <h1 className="text-lg font-semibold text-neutral-900">Mis Cuentas</h1>
                    <CreateAccountButton banks={banks} />
                </div>
            </div>

            <div className="px-5 space-y-5 max-w-6xl mx-auto pt-5">
                {/* Total Balance */}
                <div className="bg-white rounded-2xl p-6 border border-neutral-100">
                    <p className="text-xs text-neutral-400 font-medium uppercase tracking-wide mb-1">Balance Total</p>
                    <p className="text-3xl font-black tracking-tight text-neutral-900 font-mono">{formatCurrency(totalBalance)}</p>
                    <p className="text-xs text-neutral-400 mt-2">{accounts.length} cuenta{accounts.length !== 1 ? 's' : ''} activa{accounts.length !== 1 ? 's' : ''}</p>
                </div>

                {/* Accounts Bento Grid by Bank */}
                <div className="space-y-4">
                    {Object.entries(groupedAccounts).map(([bankName, bankAccounts]) => (
                        <div key={bankName} className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
                            {/* Bank Header */}
                            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-neutral-100">
                                <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white overflow-hidden shrink-0"
                                    style={{ backgroundColor: bankAccounts[0].banks?.logo_url ? 'transparent' : bankAccounts[0].bankColor }}
                                >
                                    {bankAccounts[0].banks?.logo_url ? (
                                        <img src={bankAccounts[0].banks.logo_url} alt="" className="w-full h-full object-contain" />
                                    ) : (
                                        bankName.substring(0, 2).toUpperCase()
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-sm font-semibold text-neutral-900">{bankName}</h2>
                                    <p className="text-xs text-neutral-400">{bankAccounts.length} cuenta{bankAccounts.length !== 1 ? 's' : ''}</p>
                                </div>
                                <p className="text-sm font-bold text-neutral-900 font-mono">
                                    {formatCurrency(bankAccounts.reduce((sum, a) => sum + a.current_balance, 0))}
                                </p>
                            </div>

                            {/* Accounts Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-neutral-100">
                                {bankAccounts.map((acc) => (
                                    <Link
                                        key={acc.id}
                                        href={`/dashboard/cuentas/${acc.id}`}
                                        className="p-4 hover:bg-neutral-50 transition-colors group"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-semibold text-neutral-900">{acc.name}</h3>
                                                {acc.is_favorite && <span className="text-amber-400 text-xs">★</span>}
                                            </div>
                                            <span className="text-[10px] font-medium text-neutral-400 uppercase">
                                                {acc.type === 'checking' ? 'Corriente' :
                                                 acc.type === 'savings' ? 'Ahorro' :
                                                 acc.type === 'investment' ? 'Inversión' :
                                                 acc.type === 'wallet' ? 'Cartera' : acc.type}
                                            </span>
                                        </div>

                                        <p className="text-2xl font-black text-neutral-900 font-mono tracking-tight mb-3">
                                            {formatCurrency(acc.current_balance)}
                                        </p>

                                        {(acc.yearlyIncome > 0 || acc.yearlyExpense > 0) && (
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1 text-xs">
                                                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                                                    <span className="text-emerald-600 font-medium font-mono">+{formatNumber(acc.yearlyIncome)}€</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-xs">
                                                    <TrendingDown className="w-3 h-3 text-rose-400" />
                                                    <span className="text-rose-500 font-medium font-mono">-{formatNumber(acc.yearlyExpense)}€</span>
                                                </div>
                                            </div>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}

                    {accounts.length === 0 && (
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
