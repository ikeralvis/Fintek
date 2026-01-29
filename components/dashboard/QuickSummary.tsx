import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';

type Props = {
    income: number;
    expense: number;
    balance: number;
};

export default function QuickSummary({ income, expense, balance }: Props) {
    return (
        <div className="grid grid-cols-3 gap-3 mb-8">
            {/* Income */}
            <div className="bg-white p-4 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-neutral-100 flex flex-col items-center text-center">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mb-2 text-green-600">
                    <ArrowDownLeft className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-neutral-400 mb-1">Ingresos</span>
                <span className="text-sm font-bold text-neutral-900 truncate w-full">
                    {new Intl.NumberFormat('es-ES', { style: 'decimal', minimumFractionDigits: 0 }).format(income)}
                </span>
            </div>

            {/* Expenses */}
            <div className="bg-white p-4 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-neutral-100 flex flex-col items-center text-center">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center mb-2 text-red-600">
                    <ArrowUpRight className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-neutral-400 mb-1">Gastos</span>
                <span className="text-sm font-bold text-neutral-900 truncate w-full">
                    {new Intl.NumberFormat('es-ES', { style: 'decimal', minimumFractionDigits: 0 }).format(expense)}
                </span>
            </div>

            {/* Balance */}
            <div className="bg-white p-4 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-neutral-100 flex flex-col items-center text-center">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mb-2 text-blue-600">
                    <Wallet className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-neutral-400 mb-1">Neto</span>
                <span className={`text-sm font-bold truncate w-full ${balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {new Intl.NumberFormat('es-ES', { style: 'decimal', minimumFractionDigits: 0 }).format(balance)}
                </span>
            </div>
        </div>
    );
}
