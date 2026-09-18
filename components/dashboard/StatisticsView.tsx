'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, ReferenceLine
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import {
    format, subMonths, addMonths, startOfMonth, endOfMonth,
    parseISO, startOfYear, eachMonthOfInterval, eachDayOfInterval, isValid, isWithinInterval
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
    TrendingUp, Wallet, ArrowLeft,
    Download,
    BarChart3, ArrowUpRight, ArrowDownRight,
    ChevronLeft, ChevronRight, Coins
} from 'lucide-react';
import jsPDF from 'jspdf';
import Link from 'next/link';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { formatCurrency } from '@/lib/utils';

const COLORS = [
    '#52525b', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#84cc16'
];
const OTROS_COLOR = '#a1a1aa';
const OTROS_THRESHOLD_PCT = 3;

const incomeExpenseConfig: ChartConfig = {
    income: { label: 'Ingresos', color: '#10b981' },
    expense: { label: 'Gastos', color: '#f43f5e' },
};

const balanceConfig: ChartConfig = {
    balance: { label: 'Balance', color: '#3f3f46' },
};

type PeriodType = 'month' | 'year';

export default function StatisticsView({ initialTransactions, accounts, categories }: any) {
    const [periodType, setPeriodType] = useState<PeriodType>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [exporting, setExporting] = useState(false);

    const stats = useMemo(() => {
        let startDate: Date;
        let endDate: Date;

        if (periodType === 'month') {
            startDate = startOfMonth(currentDate);
            endDate = endOfMonth(currentDate);
        } else {
            startDate = startOfYear(currentDate);
            endDate = endOfMonth(currentDate);
        }

        const filteredTxs = initialTransactions.filter((t: any) => {
            const d = parseISO(t.transaction_date);
            if (!isValid(d)) return false;
            return isWithinInterval(d, { start: startDate, end: endDate });
        });

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

        Object.values(monthlyData).forEach(m => {
            m.balance = m.income - m.expense;
        });

        // Serie del gráfico: en vista "Mes" un único punto mensual no dice nada, así que
        // se desglosa día a día (con balance acumulado); en vista "Año" se mantiene por meses.
        let chartData: { label: string; income: number; expense: number; balance: number }[];
        if (periodType === 'month') {
            const dailyMap: Record<string, { income: number; expense: number }> = {};
            const days = eachDayOfInterval({ start: startDate, end: endDate });
            days.forEach(d => { dailyMap[format(d, 'yyyy-MM-dd')] = { income: 0, expense: 0 }; });
            filteredTxs.forEach((t: any) => {
                const key = t.transaction_date.substring(0, 10);
                if (dailyMap[key]) {
                    if (t.type === 'income') dailyMap[key].income += t.amount;
                    else if (t.type === 'expense') dailyMap[key].expense += t.amount;
                }
            });
            let running = 0;
            chartData = days.map(d => {
                const key = format(d, 'yyyy-MM-dd');
                const { income, expense } = dailyMap[key];
                running += income - expense;
                return { label: format(d, 'd'), income, expense, balance: running };
            });
        } else {
            chartData = Object.values(monthlyData).map(m => ({ label: m.month, income: m.income, expense: m.expense, balance: m.balance }));
        }

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

        const totalIncome = filteredTxs.filter((t: any) => t.type === 'income').reduce((acc: number, t: any) => acc + t.amount, 0);
        const totalExpense = filteredTxs.filter((t: any) => t.type === 'expense').reduce((acc: number, t: any) => acc + t.amount, 0);
        const balance = totalIncome - totalExpense;
        const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

        // Gasto hormiga: transacciones pequeñas (< 10€) que por separado no se notan pero suman
        const MICRO_THRESHOLD = 10;
        const microTxs = filteredTxs.filter((t: any) => t.type === 'expense' && t.amount < MICRO_THRESHOLD);
        const microTotal = microTxs.reduce((acc: number, t: any) => acc + t.amount, 0);
        const microPct = totalExpense > 0 ? (microTotal / totalExpense) * 100 : 0;

        // Comparison with previous period
        let prevStartDate: Date;
        let prevEndDate: Date;

        if (periodType === 'month') {
            prevStartDate = startOfMonth(subMonths(currentDate, 1));
            prevEndDate = endOfMonth(subMonths(currentDate, 1));
        } else {
            prevStartDate = startOfYear(subMonths(currentDate, 12));
            prevEndDate = endOfMonth(subMonths(currentDate, 1));
        }

        const prevTxs = initialTransactions.filter((t: any) => {
            const d = parseISO(t.transaction_date);
            return isValid(d) && isWithinInterval(d, { start: prevStartDate, end: prevEndDate });
        });

        const prevIncome = prevTxs.filter((t: any) => t.type === 'income').reduce((acc: number, t: any) => acc + t.amount, 0);
        const prevExpense = prevTxs.filter((t: any) => t.type === 'expense').reduce((acc: number, t: any) => acc + t.amount, 0);

        const incomeChange = prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : 0;
        const expenseChange = prevExpense > 0 ? ((totalExpense - prevExpense) / prevExpense) * 100 : 0;

        const rawPieData = categoryArray
            .filter(c => c.expense > 0)
            .map(c => ({ name: c.name, value: c.expense, color: c.color }))
            .sort((a, b) => b.value - a.value);

        // Agrupa automáticamente las categorías por debajo del 3% del gasto total bajo "Otros"
        // para que la leyenda del donut no se llene de porciones minúsculas.
        const pieThreshold = totalExpense * (OTROS_THRESHOLD_PCT / 100);
        const pieBig = rawPieData.filter(c => c.value >= pieThreshold);
        const pieSmall = rawPieData.filter(c => c.value < pieThreshold);
        const pieOtrosTotal = pieSmall.reduce((sum, c) => sum + c.value, 0);
        const pieData = pieOtrosTotal > 0
            ? [...pieBig, { name: 'Otros', value: pieOtrosTotal, color: OTROS_COLOR }]
            : pieBig;

        return {
            monthlyData: Object.values(monthlyData),
            chartData,
            categoryArray,
            pieData,
            totals: { income: totalIncome, expense: totalExpense, balance, savingsRate },
            microSpending: { total: microTotal, count: microTxs.length, pct: microPct },
            comparison: { incomeChange, expenseChange },
            txCount: filteredTxs.length
        };
    }, [initialTransactions, periodType, currentDate]);

    const pieConfig: ChartConfig = useMemo(() => Object.fromEntries(
        stats.pieData.map((c: any, i: number) => [c.name, { label: c.name, color: c.color || COLORS[i % COLORS.length] }])
    ), [stats.pieData]);

    const handleExportPDF = () => {
        setExporting(true);
        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const w = pdf.internal.pageSize.getWidth();
            let y = 15;

            const addText = (text: string, x: number, yPos: number, opts: { size?: number; bold?: boolean; color?: [number, number, number] } = {}) => {
                pdf.setFontSize(opts.size || 10);
                pdf.setFont('helvetica', opts.bold ? 'bold' : 'normal');
                pdf.setTextColor(...(opts.color || [24, 24, 27]));
                pdf.text(text, x, yPos);
            };

            const addLine = (yPos: number) => {
                pdf.setDrawColor(228, 228, 231);
                pdf.line(15, yPos, w - 15, yPos);
            };

            // Header
            addText('FinTek — Informe Financiero', 15, y, { size: 16, bold: true });
            y += 7;
            addText(`Período: ${periodLabel}`, 15, y, { size: 10, color: [113, 113, 122] });
            addText(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, w - 65, y, { size: 8, color: [161, 161, 170] });
            y += 10;
            addLine(y); y += 8;

            // Summary
            addText('RESUMEN', 15, y, { size: 11, bold: true });
            y += 8;

            const summaryData = [
                ['Ingresos', `+${stats.totals.income.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€`, [16, 185, 129] as [number, number, number]],
                ['Gastos', `-${stats.totals.expense.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€`, [244, 63, 94] as [number, number, number]],
                ['Balance', `${stats.totals.balance >= 0 ? '+' : ''}${stats.totals.balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€`, stats.totals.balance >= 0 ? [16, 185, 129] as [number, number, number] : [244, 63, 94] as [number, number, number]],
                ['Tasa de ahorro', `${stats.totals.savingsRate.toFixed(1)}%`, [99, 102, 241] as [number, number, number]],
                ['Gasto hormiga (<10€)', `${stats.microSpending.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€ (${stats.microSpending.count} compras)`, [217, 119, 6] as [number, number, number]],
            ];

            for (const [label, value, color] of summaryData) {
                addText(label as string, 20, y, { color: [113, 113, 122] });
                addText(value as string, 80, y, { bold: true, color: color as [number, number, number] });
                y += 6;
            }

            y += 6; addLine(y); y += 8;

            // Accounts
            addText('SALDOS POR CUENTA', 15, y, { size: 11, bold: true });
            y += 8;

            const accountGroups: Record<string, typeof accounts> = {};
            for (const acc of accounts) {
                const bankName = (acc as any).banks?.name || 'Otros';
                if (!accountGroups[bankName]) accountGroups[bankName] = [];
                accountGroups[bankName].push(acc);
            }

            for (const [bankName, accs] of Object.entries(accountGroups)) {
                addText(bankName.toUpperCase(), 20, y, { size: 8, bold: true, color: [113, 113, 122] });
                y += 5;
                for (const acc of accs) {
                    addText(`  ${(acc as any).name}`, 20, y);
                    addText(`${(acc as any).current_balance?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€`, 120, y, { bold: true });
                    y += 5;
                }
                y += 3;
            }

            y += 4; addLine(y); y += 8;

            // Categories breakdown
            addText('DESGLOSE POR CATEGORÍA', 15, y, { size: 11, bold: true });
            y += 8;

            addText('Categoría', 20, y, { size: 8, bold: true, color: [113, 113, 122] });
            addText('Tipo', 90, y, { size: 8, bold: true, color: [113, 113, 122] });
            addText('Importe', 120, y, { size: 8, bold: true, color: [113, 113, 122] });
            addText('Operaciones', 155, y, { size: 8, bold: true, color: [113, 113, 122] });
            y += 6;

            for (const cat of stats.categoryArray.slice(0, 15)) {
                if (y > 270) { pdf.addPage(); y = 20; }
                const isIncome = cat.income > cat.expense;
                addText(cat.name, 20, y, { size: 9 });
                addText(isIncome ? 'Ingreso' : 'Gasto', 90, y, { size: 8, color: isIncome ? [16, 185, 129] : [244, 63, 94] });
                addText(`${isIncome ? '+' : '-'}${cat.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€`, 120, y, { size: 9, bold: true });
                addText(`${cat.count}`, 160, y, { size: 9, color: [113, 113, 122] });
                y += 5.5;
            }

            y += 6; addLine(y); y += 8;

            // Monthly data
            if (stats.monthlyData.length > 1) {
                addText('EVOLUCIÓN MENSUAL', 15, y, { size: 11, bold: true });
                y += 8;
                addText('Mes', 20, y, { size: 8, bold: true, color: [113, 113, 122] });
                addText('Ingresos', 60, y, { size: 8, bold: true, color: [113, 113, 122] });
                addText('Gastos', 100, y, { size: 8, bold: true, color: [113, 113, 122] });
                addText('Balance', 140, y, { size: 8, bold: true, color: [113, 113, 122] });
                y += 6;

                for (const m of stats.monthlyData) {
                    if (y > 270) { pdf.addPage(); y = 20; }
                    addText(m.month, 20, y, { size: 9 });
                    addText(`+${m.income.toLocaleString('es-ES', { maximumFractionDigits: 0 })}€`, 60, y, { size: 9, color: [16, 185, 129] });
                    addText(`-${m.expense.toLocaleString('es-ES', { maximumFractionDigits: 0 })}€`, 100, y, { size: 9, color: [244, 63, 94] });
                    addText(`${m.balance >= 0 ? '+' : ''}${m.balance.toLocaleString('es-ES', { maximumFractionDigits: 0 })}€`, 140, y, { size: 9, bold: true });
                    y += 5.5;
                }
            }

            // Footer
            y = pdf.internal.pageSize.getHeight() - 10;
            addText('Generado por FinTek', 15, y, { size: 7, color: [161, 161, 170] });
            addText(`${stats.txCount} transacciones analizadas`, w - 60, y, { size: 7, color: [161, 161, 170] });

            pdf.save(`FinTek_Informe_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } catch (err) {
            console.error("PDF Error", err);
            alert('Error al generar PDF');
        } finally {
            setExporting(false);
        }
    };

    const formatCompact = (n: number) => new Intl.NumberFormat('es-ES', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

    const navigatePeriod = (direction: number) => {
        if (periodType === 'month') {
            setCurrentDate(prev => direction > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
        } else {
            setCurrentDate(prev => new Date(prev.getFullYear() + direction, prev.getMonth(), 1));
        }
    };

    const periodLabel = periodType === 'month'
        ? format(currentDate, 'MMMM yyyy', { locale: es })
        : format(currentDate, 'yyyy');

    if (!initialTransactions || initialTransactions.length === 0) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
                <BarChart3 className="w-16 h-16 text-muted-foreground mb-4" />
                <h2 className="text-xl font-bold text-foreground mb-2">Sin datos todavía</h2>
                <p className="text-muted-foreground max-w-md mb-6">Añade transacciones para ver tus estadísticas detalladas.</p>
                <Link href="/dashboard/transacciones/nueva" className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl text-sm font-bold">
                    Añadir transacción
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-32 md:pb-8">
            {/* Header */}
            <div className="sticky top-0 z-20 glass-nav border-b px-5 py-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <Link href="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
                        <ArrowLeft className="w-5 h-5 text-foreground" />
                    </Link>
                    <h1 className="text-lg font-semibold text-foreground">Estadísticas</h1>
                    <button onClick={handleExportPDF} disabled={exporting} className="p-2 rounded-xl hover:bg-muted">
                        <Download className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>
            </div>

            <div className="px-5 space-y-5 max-w-6xl mx-auto pt-5">
                {/* Period Selector */}
                <div className="flex items-center gap-3">
                    <div className="flex bg-muted rounded-xl p-0.5">
                        <button
                            onClick={() => setPeriodType('month')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                periodType === 'month' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                            }`}
                        >
                            Mes
                        </button>
                        <button
                            onClick={() => setPeriodType('year')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                periodType === 'year' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                            }`}
                        >
                            Año
                        </button>
                    </div>

                    <div className="flex items-center gap-1 ml-auto bg-card border border-border rounded-xl px-1 py-1">
                        <button onClick={() => navigatePeriod(-1)} className="p-1.5 hover:bg-muted rounded-lg">
                            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <span className="relative inline-block min-w-[110px] h-5 overflow-hidden text-center">
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.span
                                    key={periodLabel}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                                    className="absolute inset-x-0 text-sm font-medium text-foreground capitalize"
                                >
                                    {periodLabel}
                                </motion.span>
                            </AnimatePresence>
                        </span>
                        <button onClick={() => navigatePeriod(1)} className="p-1.5 hover:bg-muted rounded-lg">
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* Contenido del período: se reanima con un fundido + leve ascenso al cambiar
                    de mes/año, en vez de un corte instantáneo de todas las cifras. */}
                <motion.div
                    key={`${periodType}-${periodLabel}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-5"
                >
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="bg-card rounded-2xl p-4 border border-border">
                        <div className="flex items-center gap-2 mb-2">
                            <ArrowUpRight className="w-4 h-4 text-secondary-600 dark:text-secondary-400" />
                            <span className="text-xs font-semibold text-secondary-600 dark:text-secondary-400 uppercase">Ingresos</span>
                        </div>
                        <p className="text-2xl font-bold tabular-nums text-secondary-700 dark:text-secondary-400">{formatCompact(stats.totals.income)}€</p>
                        {stats.comparison.incomeChange !== 0 && (
                            <p className={`text-xs font-medium mt-1 ${stats.comparison.incomeChange >= 0 ? 'text-secondary-600 dark:text-secondary-400' : 'text-accent-600 dark:text-accent-400'}`}>
                                {stats.comparison.incomeChange >= 0 ? '+' : ''}{stats.comparison.incomeChange.toFixed(0)}% vs anterior
                            </p>
                        )}
                    </div>

                    <div className="bg-card rounded-2xl p-4 border border-border">
                        <div className="flex items-center gap-2 mb-2">
                            <ArrowDownRight className="w-4 h-4 text-accent-600 dark:text-accent-400" />
                            <span className="text-xs font-semibold text-accent-600 dark:text-accent-400 uppercase">Gastos</span>
                        </div>
                        <p className="text-2xl font-bold tabular-nums text-accent-700 dark:text-accent-400">{formatCompact(stats.totals.expense)}€</p>
                        {stats.comparison.expenseChange !== 0 && (
                            <p className={`text-xs font-medium mt-1 ${stats.comparison.expenseChange <= 0 ? 'text-secondary-600 dark:text-secondary-400' : 'text-accent-600 dark:text-accent-400'}`}>
                                {stats.comparison.expenseChange >= 0 ? '+' : ''}{stats.comparison.expenseChange.toFixed(0)}% vs anterior
                            </p>
                        )}
                    </div>

                    <div className="bg-card rounded-2xl p-4 border border-border">
                        <div className="flex items-center gap-2 mb-2">
                            <Wallet className="w-4 h-4 text-muted-foreground" />
                            <span className="text-xs font-semibold text-muted-foreground uppercase">Balance</span>
                        </div>
                        <p className={`text-2xl font-bold tabular-nums ${stats.totals.balance >= 0 ? 'text-secondary-600 dark:text-secondary-400' : 'text-accent-600 dark:text-accent-400'}`}>
                            {stats.totals.balance >= 0 ? '+' : ''}{formatCompact(stats.totals.balance)}€
                        </p>
                    </div>

                    <div className="bg-card rounded-2xl p-4 border border-border">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-muted-foreground" />
                            <span className="text-xs font-semibold text-muted-foreground uppercase">Ahorro</span>
                        </div>
                        <p className={`text-2xl font-bold tabular-nums ${stats.totals.savingsRate >= 0 ? 'text-secondary-600 dark:text-secondary-400' : 'text-accent-600 dark:text-accent-400'}`}>
                            {stats.totals.savingsRate.toFixed(0)}%
                        </p>
                    </div>

                    <div className="bg-card rounded-2xl p-4 border border-border col-span-2 md:col-span-1">
                        <div className="flex items-center gap-2 mb-2">
                            <Coins className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase">Gasto Hormiga</span>
                        </div>
                        <p className="text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-400">{formatCompact(stats.microSpending.total)}€</p>
                        <p className="text-xs font-medium text-muted-foreground mt-1">
                            {stats.microSpending.count} compras &lt;10€ · {stats.microSpending.pct.toFixed(0)}% del gasto
                        </p>
                    </div>
                </div>

                {/* Charts - Side by side on desktop */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Income vs Expense: barras agrupadas (más fiables al tacto que una línea fina) */}
                    <div className="bg-card rounded-2xl p-5 border border-border">
                        <h3 className="text-sm font-bold text-foreground mb-4">Ingresos vs Gastos</h3>
                        <ChartContainer config={incomeExpenseConfig} className="h-[220px]">
                            <BarChart data={stats.chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barGap={2}>
                                <defs>
                                    <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.5} />
                                    </linearGradient>
                                    <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.9} />
                                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.5} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} interval={periodType === 'month' ? 4 : 0} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                <ChartTooltip
                                    cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
                                    content={<ChartTooltipContent formatter={(val) => `${formatCompact(val)}€`} />}
                                />
                                <Bar dataKey="income" name="Ingresos" fill="url(#gradIncome)" radius={[3, 3, 0, 0]} maxBarSize={18} animationDuration={500} animationEasing="ease-out" />
                                <Bar dataKey="expense" name="Gastos" fill="url(#gradExpense)" radius={[3, 3, 0, 0]} maxBarSize={18} animationDuration={500} animationEasing="ease-out" />
                            </BarChart>
                        </ChartContainer>
                    </div>

                    {/* Balance Evolution: sombreado rojo/rosa suave al entrar en negativo */}
                    <div className="bg-card rounded-2xl p-5 border border-border">
                        <h3 className="text-sm font-bold text-foreground mb-4">Evolución del Balance{periodType === 'month' ? ' (acumulado)' : ''}</h3>
                        <ChartContainer config={balanceConfig} className="h-[220px]">
                            <AreaChart data={stats.chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <defs>
                                    {(() => {
                                        const balanceValues = stats.chartData.map(d => d.balance);
                                        const balanceMax = Math.max(0, ...balanceValues);
                                        const balanceMin = Math.min(0, ...balanceValues);
                                        const zeroOffset = balanceMax - balanceMin > 0 ? balanceMax / (balanceMax - balanceMin) : 1;
                                        return (
                                            <linearGradient id="gradBalance" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset={0} stopColor="#3f3f46" stopOpacity={0.4} />
                                                <stop offset={zeroOffset} stopColor="#3f3f46" stopOpacity={0.05} />
                                                <stop offset={zeroOffset} stopColor="#f43f5e" stopOpacity={0.1} />
                                                <stop offset={1} stopColor="#f43f5e" stopOpacity={0.4} />
                                            </linearGradient>
                                        );
                                    })()}
                                </defs>
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} interval={periodType === 'month' ? 4 : 0} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} domain={['dataMin', 'dataMax']} />
                                <ReferenceLine y={0} stroke="var(--border)" />
                                <ChartTooltip
                                    content={<ChartTooltipContent formatter={(val) => `${formatCompact(val)}€`} />}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="balance"
                                    name="Balance"
                                    stroke="#3f3f46"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#gradBalance)"
                                    dot={stats.chartData.length <= 2}
                                    activeDot={{ r: 5 }}
                                    animationDuration={600}
                                    animationEasing="ease-out"
                                />
                            </AreaChart>
                        </ChartContainer>
                    </div>
                </div>

                {/* Bottom row - Pie + Categories */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {stats.pieData.length > 0 && (
                        <div className="bg-card rounded-2xl p-5 border border-border">
                            <h3 className="text-sm font-bold text-foreground mb-4">Distribución de Gastos</h3>
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                <div className="w-40 h-40 relative shrink-0">
                                    <ChartContainer config={pieConfig} className="h-full">
                                        <PieChart>
                                            <Pie
                                                data={stats.pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={45}
                                                outerRadius={60}
                                                paddingAngle={2}
                                                dataKey="value"
                                                animationDuration={500}
                                                animationEasing="ease-out"
                                            >
                                                {stats.pieData.map((entry: any, i: number) => (
                                                    <Cell key={entry.name} fill={entry.color || COLORS[i % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <ChartTooltip
                                                content={<ChartTooltipContent hideLabel formatter={(val) => `${formatCompact(val)}€`} />}
                                            />
                                        </PieChart>
                                    </ChartContainer>
                                </div>
                                <div className="flex-1 w-full space-y-2 max-h-40 overflow-y-auto">
                                    {stats.pieData.map((item: any, i: number) => {
                                        const pct = stats.totals.expense > 0 ? (item.value / stats.totals.expense) * 100 : 0;
                                        return (
                                            <div key={item.name} className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color || COLORS[i % COLORS.length] }} />
                                                    <span className="font-medium text-foreground truncate">{item.name}</span>
                                                </div>
                                                <span className="font-bold tabular-nums text-foreground shrink-0 ml-2">
                                                    {formatCurrency(item.value)} · {pct.toFixed(1)}%
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-card rounded-2xl p-5 border border-border">
                        <h3 className="text-sm font-bold text-foreground mb-4">Categorías</h3>
                        <div className="space-y-3">
                            {stats.categoryArray.slice(0, 10).map((cat: any) => {
                                const maxValue = stats.categoryArray[0]?.total || 1;
                                const percentage = (cat.total / maxValue) * 100;
                                const isIncome = cat.income > cat.expense;

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
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-sm font-medium text-foreground truncate">{cat.name}</span>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                                        isIncome ? 'bg-secondary-500/10 text-secondary-600 dark:text-secondary-400' : 'bg-accent-500/10 text-accent-500 dark:text-accent-400'
                                                    }`}>
                                                        {isIncome ? 'Ingreso' : 'Gasto'}
                                                    </span>
                                                </div>
                                                <span className={`text-sm font-bold tabular-nums shrink-0 ml-2 ${isIncome ? 'text-secondary-600 dark:text-secondary-400' : 'text-foreground'}`}>
                                                    {isIncome ? '+' : '-'}{formatCompact(cat.total)}€
                                                </span>
                                            </div>
                                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
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
                </div>

                <div className="text-center py-4 text-xs text-muted-foreground">
                    {stats.txCount} transacciones en este período
                </div>
                </motion.div>
            </div>
        </div>
    );
}
