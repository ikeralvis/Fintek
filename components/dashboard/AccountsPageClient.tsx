'use client';

import { useMemo, useState } from 'react';
import { useDashboard } from '@/lib/DashboardContext';
import { ArrowLeft, Wallet, ChevronDown, Star } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import CreateAccountButton from './CreateAccountButton';
import { formatCurrency } from '@/lib/utils';

type Bank = {
    id: string;
    name: string;
    color?: string;
    logo_url?: string;
};

export default function AccountsPageClient({ banks }: { readonly banks: Bank[] }) {
    const { accounts } = useDashboard();
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

    const { groupedAccounts, totalBalance } = useMemo(() => {
        const enhanced = accounts.map(acc => ({
            ...acc,
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
    }, [accounts]);

    const toggleGroup = (bankName: string) => {
        setCollapsed(prev => ({ ...prev, [bankName]: !prev[bankName] }));
    };

    return (
        <div className="min-h-screen bg-background pb-32 md:pb-8">
            {/* Header */}
            <div className="sticky top-0 z-20 glass-nav border-b px-5 py-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <Link href="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
                        <ArrowLeft className="w-5 h-5 text-foreground" />
                    </Link>
                    <h1 className="text-lg font-semibold text-foreground">Mis Cuentas</h1>
                    <CreateAccountButton banks={banks} />
                </div>
            </div>

            <div className="px-5 space-y-5 max-w-6xl mx-auto pt-5">
                {/* Total Balance */}
                <div className="bg-card rounded-2xl p-6 border border-border">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Balance Total</p>
                    <p className="text-3xl font-black tracking-tight text-foreground tabular-nums">{formatCurrency(totalBalance)}</p>
                    <p className="text-xs text-muted-foreground mt-2">{accounts.length} cuenta{accounts.length !== 1 ? 's' : ''} activa{accounts.length !== 1 ? 's' : ''}</p>
                </div>

                {/* Accounts grouped by bank entity */}
                <div className="space-y-4">
                    {Object.entries(groupedAccounts).map(([bankName, bankAccounts]) => {
                        const isCollapsed = collapsed[bankName];
                        return (
                            <div key={bankName} className="bg-card rounded-2xl border border-border overflow-hidden">
                                {/* Bank Header (toggle) */}
                                <button
                                    type="button"
                                    onClick={() => toggleGroup(bankName)}
                                    className="flex w-full items-center gap-3 px-5 py-3.5 border-b border-border text-left hover:bg-muted/40 transition-colors"
                                    aria-expanded={!isCollapsed}
                                >
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
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-sm font-semibold text-foreground">{bankName}</h2>
                                        <p className="text-xs text-muted-foreground">{bankAccounts.length} cuenta{bankAccounts.length !== 1 ? 's' : ''}</p>
                                    </div>
                                    <p className="text-sm font-bold text-foreground tabular-nums">
                                        {formatCurrency(bankAccounts.reduce((sum, a) => sum + a.current_balance, 0))}
                                    </p>
                                    <ChevronDown
                                        className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}
                                    />
                                </button>

                                {/* Accounts Grid */}
                                <AnimatePresence initial={false}>
                                    {!isCollapsed && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                            className="overflow-hidden"
                                        >
                                            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                                                {bankAccounts.map((acc) => (
                                                    <Link
                                                        key={acc.id}
                                                        href={`/dashboard/cuentas/${acc.id}`}
                                                        className="p-4 hover:bg-muted/60 transition-colors"
                                                    >
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="text-sm font-semibold text-foreground">{acc.name}</h3>
                                                                {acc.is_favorite && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                                                            </div>
                                                            <span className="text-[10px] font-medium text-muted-foreground uppercase">
                                                                {acc.type === 'checking' ? 'Corriente' :
                                                                 acc.type === 'savings' ? 'Ahorro' :
                                                                 acc.type === 'investment' ? 'Inversión' :
                                                                 acc.type === 'wallet' ? 'Cartera' : acc.type}
                                                            </span>
                                                        </div>

                                                        <p className="text-2xl font-black text-foreground tabular-nums tracking-tight">
                                                            {formatCurrency(acc.current_balance)}
                                                        </p>
                                                    </Link>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}

                    {accounts.length === 0 && (
                        <div className="text-center py-16">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                <Wallet className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <p className="text-muted-foreground font-medium mb-1">No tienes cuentas</p>
                            <p className="text-sm text-muted-foreground">Pulsa + para crear tu primera cuenta</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
