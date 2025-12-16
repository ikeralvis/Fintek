'use client';

import { forwardRef } from 'react';
import { Wallet, TrendingUp, TrendingDown, CreditCard } from 'lucide-react';
import SummaryCharts from './SummaryCharts';

type Props = {
    userName: string;
    totalBalance: number;
    monthlyIncome: number;
    monthlyExpense: number;
    accounts: any[];
    budgets: any[];
    monthlySeries: any[];
    monthlyData: any;
};

const ReportView = forwardRef<HTMLDivElement, Props>(({
    userName,
    totalBalance,
    monthlyIncome,
    monthlyExpense,
    accounts,
    budgets,
    monthlyData
}, ref) => {
    const date = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div ref={ref} className="bg-white p-6 max-w-[800px] mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 border-b border-neutral-200 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-primary-900 flex items-center gap-2" style={{ color: '#004488' }}>
                        <Wallet className="h-6 w-6" />
                        FinTek
                    </h1>
                    <p className="text-sm text-neutral-500 mt-1" style={{ color: '#737373' }}>Informe Financiero</p>
                </div>
                <div className="text-right">
                    <h2 className="text-lg font-semibold text-neutral-900" style={{ color: '#171717' }}>{userName}</h2>
                    <p className="text-xs text-neutral-500" style={{ color: '#737373' }}>{date}</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-3 rounded-xl" style={{ backgroundColor: '#e6f2ff' }}>
                    <p className="text-xs font-medium mb-1" style={{ color: '#005bb5' }}>Balance Total</p>
                    <p className="text-xl font-bold" style={{ color: '#002a52' }}>
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalBalance)}
                    </p>
                </div>
                <div className="p-3 rounded-xl" style={{ backgroundColor: '#ecfdf5' }}>
                    <p className="text-xs font-medium mb-1" style={{ color: '#047857' }}>Ingresos (Mes)</p>
                    <p className="text-xl font-bold flex items-center gap-2" style={{ color: '#064e3b' }}>
                        <TrendingUp className="h-4 w-4" />
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(monthlyIncome)}
                    </p>
                </div>
                <div className="p-3 rounded-xl" style={{ backgroundColor: '#fef2f2' }}>
                    <p className="text-xs font-medium mb-1" style={{ color: '#b91c1c' }}>Gastos (Mes)</p>
                    <p className="text-xl font-bold flex items-center gap-2" style={{ color: '#7f1d1d' }}>
                        <TrendingDown className="h-4 w-4" />
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(monthlyExpense)}
                    </p>
                </div>
            </div>

            {/* Accounts */}
            <div className="mb-6">
                <h3 className="text-base font-bold text-neutral-900 mb-3 flex items-center gap-2" style={{ color: '#171717' }}>
                    <CreditCard className="h-4 w-4 text-neutral-500" />
                    Estado de Cuentas
                </h3>
                <div className="rounded-xl p-3" style={{ backgroundColor: '#fafafa' }}>
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-xs text-neutral-500 border-b border-neutral-200">
                                <th className="pb-2 font-medium" style={{ color: '#737373' }}>Cuenta</th>
                                <th className="pb-2 font-medium" style={{ color: '#737373' }}>Banco</th>
                                <th className="pb-2 font-medium text-right" style={{ color: '#737373' }}>Saldo</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs">
                            {accounts.map((acc) => (
                                <tr key={acc.id} className="border-b border-neutral-100 last:border-0">
                                    <td className="py-2 font-medium text-neutral-900" style={{ color: '#171717' }}>{acc.name}</td>
                                    <td className="py-2 text-neutral-600" style={{ color: '#525252' }}>{acc.banks?.name}</td>
                                    <td className="py-2 text-right font-bold text-neutral-900" style={{ color: '#171717' }}>
                                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(acc.current_balance)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Budgets */}
            {budgets.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-base font-bold text-neutral-900 mb-3" style={{ color: '#171717' }}>Presupuestos del Mes</h3>
                    <div className="space-y-3">
                        {budgets.map((budget) => {
                            let barColor = '#0073ea'; // primary-500
                            if (budget.percentage >= 100) barColor = '#ef4444'; // accent-500 (red)
                            else if (budget.percentage >= 80) barColor = '#eab308'; // yellow-500

                            return (
                                <div key={budget.id} className="bg-white border border-neutral-200 rounded-lg p-3">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-semibold text-sm text-neutral-900" style={{ color: '#171717' }}>{budget.categories?.name}</span>
                                        <span className="text-xs text-neutral-600" style={{ color: '#525252' }}>
                                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(budget.spent)} / {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(budget.amount)}
                                        </span>
                                    </div>
                                    <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ backgroundColor: '#f5f5f5' }}>
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${Math.min(budget.percentage, 100)}%`,
                                                backgroundColor: barColor
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Charts */}
            <div className="mb-6">
                <h3 className="text-base font-bold text-neutral-900 mb-3" style={{ color: '#171717' }}>Análisis Mensual</h3>
                <SummaryCharts monthlyData={monthlyData} className="grid grid-cols-2 gap-4" />
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-neutral-200 text-center text-[10px] text-neutral-400" style={{ color: '#a3a3a3' }}>
                Generado automáticamente por FinTek Expense Tracker
            </div>
        </div>
    );
});

ReportView.displayName = 'ReportView';

export default ReportView;
