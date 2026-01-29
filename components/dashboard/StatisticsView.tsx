'use client';

import { useState, useMemo, useRef } from 'react';
import {
    AreaChart, Area, PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
} from 'recharts';
import {
    format, subMonths, startOfMonth, endOfMonth,
    parseISO, startOfYear, eachMonthOfInterval, isValid, isWithinInterval
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
    TrendingUp, Wallet, ArrowLeft,
    Download,
    BarChart3, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import Link from 'next/link';
import CategoryIcon from '@/components/ui/CategoryIcon';

const COLORS = [
    '#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#84cc16'
];

type PeriodType = 'month' | 'year' | 'all';

export default function StatisticsView({ initialTransactions, accounts, categories }: any) {
    const [periodType, setPeriodType] = useState<PeriodType>('all');
    const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
    const [exporting, setExporting] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    // Calculate available months from transactions
    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        initialTransactions.forEach((t: any) => {
            const d = parseISO(t.transaction_date);
            if (isValid(d)) months.add(format(d, 'yyyy-MM'));
        });
        return Array.from(months).sort((a, b) => b.localeCompare(a));
    }, [initialTransactions]);

    const stats = useMemo(() => {
        const now = new Date();
        let startDate: Date;
        let endDate: Date = now;

        if (periodType === 'month') {
            const [year, month] = selectedMonth.split('-').map(Number);
            startDate = startOfMonth(new Date(year, month - 1));
            endDate = endOfMonth(new Date(year, month - 1));
        } else if (periodType === 'year') {
            startDate = startOfYear(now);
        } else {
            startDate = new Date(1970, 0, 1);
        }

        // Filter transactions
        const filteredTxs = initialTransactions.filter((t: any) => {
            const d = parseISO(t.transaction_date);
            if (!isValid(d)) return false;
            if (!isWithinInterval(d, { start: startDate, end: endDate })) return false;
            return true;
        });

        // Monthly breakdown
        const monthlyData: Record<string, { month: string; monthKey: string; income: number; expense: number; balance: number }> = {};
        
        const monthsRange = eachMonthOfInterval({ start: startDate, end: endDate });
        monthsRange.forEach(m => {
            const key = format(m, 'yyyy-MM');
            const label = format(m, 'MMM', { locale: es });
            monthlyData[key] = { month: label, monthKey: key, income: 0, expense: 0, balance: 0 };
        });

        filteredTxs.forEach((t: any) => {
            const d = parseISO(t.transaction_date);
            const key = format(d, 'yyyy-MM');
            if (monthlyData[key]) {
                if (t.type === 'income') monthlyData[key].income += t.amount;
                else if (t.type === 'expense') monthlyData[key].expense += t.amount;
            }
        });

        // Calculate balance for each month
        Object.values(monthlyData).forEach(m => {
            m.balance = m.income - m.expense;
        });

        // Category breakdown
        const categoryStats: Record<string, { name: string; icon: string; color: string; income: number; expense: number; count: number }> = {};
        
        filteredTxs.forEach((t: any) => {
            const catId = t.category_id || 'uncategorized';
            const catName = t.categories?.name || 'Sin categoría';
            const catIcon = t.categories?.icon || 'tag';
            const catColor = t.categories?.color || '#6B7280';

            if (!categoryStats[catId]) {
                categoryStats[catId] = { name: catName, icon: catIcon, color: catColor, income: 0, expense: 0, count: 0 };
            }

            if (t.type === 'income') categoryStats[catId].income += t.amount;
            else if (t.type === 'expense') categoryStats[catId].expense += t.amount;
            categoryStats[catId].count++;
        });

        const categoryArray = Object.entries(categoryStats)
            .map(([id, data]) => ({ id, ...data, total: data.income + data.expense }))
            .sort((a, b) => b.total - a.total);

        // Totals
        const totalIncome = filteredTxs.filter((t: any) => t.type === 'income').reduce((acc: number, t: any) => acc + t.amount, 0);
        const totalExpense = filteredTxs.filter((t: any) => t.type === 'expense').reduce((acc: number, t: any) => acc + t.amount, 0);
        const balance = totalIncome - totalExpense;
        const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

        // Comparison with previous period
        let prevStartDate: Date;
        let prevEndDate: Date;
        
        if (periodType === 'month') {
            const [year, month] = selectedMonth.split('-').map(Number);
            prevStartDate = startOfMonth(subMonths(new Date(year, month - 1), 1));
            prevEndDate = endOfMonth(subMonths(new Date(year, month - 1), 1));
        } else if (periodType === 'year') {
            prevStartDate = startOfYear(subMonths(now, 12));
            prevEndDate = endOfMonth(subMonths(now, 1));
        } else {
            prevStartDate = new Date(1970, 0, 1);
            prevEndDate = subMonths(now, 12);
        }

        const prevTxs = initialTransactions.filter((t: any) => {
            const d = parseISO(t.transaction_date);
            return isValid(d) && isWithinInterval(d, { start: prevStartDate, end: prevEndDate });
        });

        const prevIncome = prevTxs.filter((t: any) => t.type === 'income').reduce((acc: number, t: any) => acc + t.amount, 0);
        const prevExpense = prevTxs.filter((t: any) => t.type === 'expense').reduce((acc: number, t: any) => acc + t.amount, 0);

        const incomeChange = prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : 0;
        const expenseChange = prevExpense > 0 ? ((totalExpense - prevExpense) / prevExpense) * 100 : 0;

        // Pie data for expenses
        const pieData = categoryArray
            .filter(c => c.expense > 0)
            .map(c => ({ name: c.name, value: c.expense, color: c.color }));

        return {
            monthlyData: Object.values(monthlyData),
            categoryArray,
            pieData,
            totals: { income: totalIncome, expense: totalExpense, balance, savingsRate },
            comparison: { incomeChange, expenseChange, prevIncome, prevExpense },
            hasData: filteredTxs.length > 0,
            txCount: filteredTxs.length
        };
    }, [initialTransactions, periodType, selectedMonth]);

    const handleExportPDF = async () => {
        if (!reportRef.current) return;
        setExporting(true);
        try {
            const canvas = await html2canvas(reportRef.current, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Estadisticas_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } catch (err) {
            console.error("PDF Error", err);
        } finally {
            setExporting(false);
        }
    };

    const formatCompact = (n: number) => new Intl.NumberFormat('es-ES', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

    if (!initialTransactions || initialTransactions.length === 0) {
        return (
            <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-8 text-center">
                <BarChart3 className="w-16 h-16 text-neutral-300 mb-4" />
                <h2 className="text-xl font-bold text-neutral-900 mb-2">Sin datos todavía</h2>
                <p className="text-neutral-500 max-w-md mb-6">Añade transacciones para ver tus estadísticas detalladas.</p>
                <Link href="/dashboard/transacciones/nueva" className="px-6 py-3 bg-neutral-900 text-white rounded-2xl text-sm font-bold">
                    Añadir transacción
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-50 pb-32">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-neutral-50/80 backdrop-blur-xl px-5 py-4">
                <div className="flex items-center justify-between">
                    <Link href="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-neutral-100 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-neutral-700" />
                    </Link>
                    <h1 className="text-lg font-semibold text-neutral-900">Estadísticas</h1>
                    <button onClick={handleExportPDF} disabled={exporting} className="p-2 rounded-xl hover:bg-neutral-100">
                        <Download className="w-5 h-5 text-neutral-600" />
                    </button>
                </div>
            </div>

            <div ref={reportRef} className="px-5 space-y-5 max-w-2xl mx-auto">
                {/* Period Selector */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    <button
                        onClick={() => setPeriodType('month')}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                            periodType === 'month' ? 'bg-neutral-900 text-white' : 'bg-white border border-neutral-200 text-neutral-600'
                        }`}
                    >
                        Mensual
                    </button>
                    <button
                        onClick={() => setPeriodType('year')}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                            periodType === 'year' ? 'bg-neutral-900 text-white' : 'bg-white border border-neutral-200 text-neutral-600'
                        }`}
                    >
                        Este Año
                    </button>
                    <button
                        onClick={() => setPeriodType('all')}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                            periodType === 'all' ? 'bg-neutral-900 text-white' : 'bg-white border border-neutral-200 text-neutral-600'
                        }`}
                    >
                        Histórico
                    </button>

                    {periodType === 'month' && (
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="px-3 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-medium"
                        >
                            {availableMonths.map(m => (
                                <option key={m} value={m}>
                                    {format(parseISO(`${m}-01`), 'MMMM yyyy', { locale: es })}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                        <div className="flex items-center gap-2 mb-2">
                            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs font-semibold text-emerald-600 uppercase">Ingresos</span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-700">{formatCompact(stats.totals.income)}€</p>
                        {stats.comparison.incomeChange !== 0 && (
                            <p className={`text-xs font-medium mt-1 ${stats.comparison.incomeChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {stats.comparison.incomeChange >= 0 ? '+' : ''}{stats.comparison.incomeChange.toFixed(0)}% vs anterior
                            </p>
                        )}
                    </div>

                    <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100">
                        <div className="flex items-center gap-2 mb-2">
                            <ArrowDownRight className="w-4 h-4 text-rose-600" />
                            <span className="text-xs font-semibold text-rose-600 uppercase">Gastos</span>
                        </div>
                        <p className="text-2xl font-bold text-rose-700">{formatCompact(stats.totals.expense)}€</p>
                        {stats.comparison.expenseChange !== 0 && (
                            <p className={`text-xs font-medium mt-1 ${stats.comparison.expenseChange <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {stats.comparison.expenseChange >= 0 ? '+' : ''}{stats.comparison.expenseChange.toFixed(0)}% vs anterior
                            </p>
                        )}
                    </div>

                    <div className="bg-white rounded-2xl p-4 border border-neutral-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Wallet className="w-4 h-4 text-neutral-500" />
                            <span className="text-xs font-semibold text-neutral-500 uppercase">Balance</span>
                        </div>
                        <p className={`text-2xl font-bold ${stats.totals.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {stats.totals.balance >= 0 ? '+' : ''}{formatCompact(stats.totals.balance)}€
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl p-4 border border-neutral-100">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-neutral-500" />
                            <span className="text-xs font-semibold text-neutral-500 uppercase">Ahorro</span>
                        </div>
                        <p className={`text-2xl font-bold ${stats.totals.savingsRate >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {stats.totals.savingsRate.toFixed(0)}%
                        </p>
                    </div>
                </div>

                {/* Income vs Expense Chart */}
                <div className="bg-white rounded-2xl p-5 border border-neutral-100">
                    <h3 className="text-sm font-bold text-neutral-900 mb-4">Ingresos vs Gastos</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={stats.monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                                formatter={(val: number) => [`${formatCompact(val)}€`, '']}
                            />
                            <Bar dataKey="income" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="expense" name="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Expense Distribution */}
                {stats.pieData.length > 0 && (
                    <div className="bg-white rounded-2xl p-5 border border-neutral-100">
                        <h3 className="text-sm font-bold text-neutral-900 mb-4">Distribución de Gastos</h3>
                        <div className="flex items-center gap-4">
                            <div className="w-32 h-32 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats.pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={35}
                                            outerRadius={50}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {stats.pieData.map((entry: any, i: number) => (
                                                <Cell key={entry.name} fill={entry.color || COLORS[i % COLORS.length]} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex-1 space-y-2 max-h-32 overflow-y-auto">
                                {stats.pieData.slice(0, 6).map((item: any, i: number) => (
                                    <div key={item.name} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || COLORS[i % COLORS.length] }} />
                                            <span className="font-medium text-neutral-700 truncate max-w-[100px]">{item.name}</span>
                                        </div>
                                        <span className="font-bold text-neutral-900">{formatCompact(item.value)}€</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Top Categories */}
                <div className="bg-white rounded-2xl p-5 border border-neutral-100">
                    <h3 className="text-sm font-bold text-neutral-900 mb-4">Top Categorías</h3>
                    <div className="space-y-3">
                        {stats.categoryArray.slice(0, 8).map((cat: any, i: number) => {
                            const maxValue = stats.categoryArray[0]?.total || 1;
                            const percentage = (cat.total / maxValue) * 100;
                            
                            return (
                                <div key={cat.id} className="flex items-center gap-3">
                                    <div 
                                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                        style={{ backgroundColor: `${cat.color}20` }}
                                    >
                                        <CategoryIcon name={cat.icon} className="w-4 h-4" style={{ color: cat.color }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium text-neutral-900 truncate">{cat.name}</span>
                                            <span className="text-sm font-bold text-neutral-900">{formatCompact(cat.total)}€</span>
                                        </div>
                                        <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full rounded-full transition-all"
                                                style={{ width: `${percentage}%`, backgroundColor: cat.color }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Monthly Balance Evolution */}
                <div className="bg-white rounded-2xl p-5 border border-neutral-100">
                    <h3 className="text-sm font-bold text-neutral-900 mb-4">Evolución del Balance</h3>
                    <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={stats.monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                                formatter={(val: number) => [`${formatCompact(val)}€`, 'Balance']}
                            />
                            <Area type="monotone" dataKey="balance" stroke="#6366f1" fillOpacity={1} fill="url(#colorBalance)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Transaction Count */}
                <div className="text-center py-4 text-xs text-neutral-400">
                    {stats.txCount} transacciones en este período
                </div>
            </div>
        </div>
    );
}
