'use client';

import { useState, useMemo, useRef } from 'react';
import {
    LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import {
    format, subMonths, startOfMonth,
    parseISO, startOfYear, eachMonthOfInterval, isValid
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
    TrendingUp, TrendingDown, Target, Zap,
    ChevronDown, Download, PieChart as PieChartIcon,
    Share2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const COLORS = [
    '#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#14b8a6', '#f97316'
];

export default function StatisticsView({ initialTransactions, accounts, categories }: any) {
    // Default to 'all' to ensure users always see their data, even if older than 12 months
    const [period, setPeriod] = useState('all');
    const [exporting, setExporting] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    const stats = useMemo(() => {
        // 1. Period filtering
        const now = new Date();
        let startDate: Date;
        
        if (period === 'year') {
            startDate = startOfYear(now);
        } else if (period === '12m') {
            startDate = subMonths(now, 12);
        } else {
            // 'all' - no date restriction, use earliest possible date
            startDate = new Date(1970, 0, 1);
        }

        // Check filter logic
        const filteredTxs = initialTransactions.filter((t: any) => {
            const d = parseISO(t.transaction_date);
            if (!isValid(d)) return false;
            return d >= startDate && d <= now;
        });

        // 2. Net Worth Evolution (Cumulative)
        const monthlyData: Record<string, { month: string, balance: number, income: number, expense: number }> = {};
        
        // Calculate date range for months array
        let monthStartDate = startDate;
        if (period === 'all' && filteredTxs.length > 0) {
            // For 'all', use the earliest transaction date
            const earliestTx = filteredTxs.reduce((min: Date, t: any) => {
                const d = parseISO(t.transaction_date);
                return d < min ? d : min;
            }, new Date());
            monthStartDate = startOfMonth(earliestTx);
        }
        
        const months = eachMonthOfInterval({ start: monthStartDate, end: now });

        months.forEach(m => {
            const key = format(m, 'MMM yyyy', { locale: es });
            monthlyData[key] = { month: key, balance: 0, income: 0, expense: 0 };
        });

        filteredTxs.forEach((t: any) => {
            const d = parseISO(t.transaction_date);
            const m = format(d, 'MMM yyyy', { locale: es });
            if (monthlyData[m]) {
                if (t.type === 'income') {
                    monthlyData[m].income += t.amount;
                } else {
                    monthlyData[m].expense += t.amount;
                }
            }
        });

        // Calculate cumulative net worth based on monthly delta
        let runningTotal = 0;
        const netWorthData = Object.values(monthlyData).map((d: any) => {
            runningTotal += (d.income - d.expense);
            return { ...d, netWorth: runningTotal };
        });

        // 3. Category Distribution (Expenses)
        const categoryStats: Record<string, number> = {};
        filteredTxs.filter((t: any) => t.type === 'expense').forEach((t: any) => {
            const name = t.categories?.name || t.category || 'Varios';
            categoryStats[name] = (categoryStats[name] || 0) + t.amount;
        });

        const pieData = Object.entries(categoryStats)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // 4. Trends by Category (Top 5)
        const top5Names = pieData.slice(0, 5).map(d => d.name);
        const categoryTrends: any[] = Object.values(monthlyData).map(m => {
            const d: any = { month: m.month };
            top5Names.forEach(name => {
                d[name] = 0;
            });
            return d;
        });

        filteredTxs.filter((t: any) => t.type === 'expense').forEach((t: any) => {
            const name = t.categories?.name || t.category || 'Varios';
            if (top5Names.includes(name)) {
                const mKey = format(parseISO(t.transaction_date), 'MMM yyyy', { locale: es });
                const found = categoryTrends.find(item => item.month === mKey);
                if (found) found[name] += t.amount;
            }
        });

        // 5. KPIs
        const totalIncome = filteredTxs.filter((t: any) => t.type === 'income').reduce((acc: number, t: any) => acc + t.amount, 0);
        const totalExpense = filteredTxs.filter((t: any) => t.type === 'expense').reduce((acc: number, t: any) => acc + t.amount, 0);
        const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
        const dailyAvg = months.length > 0 ? totalExpense / (months.length * 30) : 0;
        const topCategory = pieData[0]?.name || 'N/A';

        const bestMonthTotal = Object.values(monthlyData).reduce((best: any, curr: any) => {
            const saved = curr.income - curr.expense;
            return saved > (best.saved || -Infinity) ? { month: curr.month, saved } : best;
        }, { month: 'N/A', saved: -Infinity });

        return {
            netWorthData,
            pieData,
            barData: Object.values(monthlyData),
            categoryTrends,
            top5Names,
            kpis: { totalIncome, totalExpense, savingsRate, dailyAvg, topCategory, bestMonth: bestMonthTotal.month },
            hasData: filteredTxs.length > 0
        };
    }, [initialTransactions, period]);

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
            pdf.save(`Reporte_Financiero_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        } catch (err) {
            console.error("PDF Fail", err);
            alert("Error al generar PDF");
        } finally {
            setExporting(false);
        }
    };

    // Only show Empty State if really empty (and even then, maybe show dashboard)
    if (!initialTransactions || initialTransactions.length === 0) {
        return (
            <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-8 text-center">
                <PieChartIcon className="w-16 h-16 text-neutral-300 mb-4" />
                <h2 className="text-xl font-bold text-neutral-900">Sin datos todavía</h2>
                <p className="text-neutral-500 max-w-md mb-6">Tus estadísticas aparecerán aquí cuando añadas tus primeros ingresos o gastos.</p>
                <a href="/dashboard/transacciones/nueva" className="px-6 py-3 bg-neutral-900 text-white rounded-full text-sm font-bold shadow-lg hover:bg-neutral-800 transition-colors">
                    Añadir primera transacción
                </a>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-50 pb-32">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-neutral-100 mb-8">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between max-w-5xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                            <PieChartIcon className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-xl font-bold text-neutral-900 hidden sm:block">Reporte Financiero</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <select
                                value={period}
                                onChange={(e) => setPeriod(e.target.value)}
                                className="appearance-none bg-neutral-100 border-none rounded-2xl px-4 py-2 text-xs font-bold text-neutral-600 focus:ring-2 focus:ring-neutral-200 pr-10"
                            >
                                <option value="year">Este Año</option>
                                <option value="12m">Últimos 12 meses</option>
                                <option value="all">Histórico Completo</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                        </div>
                        <button
                            onClick={handleExportPDF}
                            disabled={exporting}
                            className="p-2 bg-neutral-900 rounded-xl text-white hover:bg-neutral-800 transition-colors flex items-center gap-2"
                        >
                            {exporting ? <Share2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* REPORT CONTENT */}
            <div ref={reportRef} className="container mx-auto px-6 max-w-5xl space-y-8 bg-neutral-50">

                {/* KPI CARDS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <KPICard title="Tasa de Ahorro" value={`${stats.kpis.savingsRate.toFixed(1)}%`} icon={<Target className="text-indigo-500" />} />
                    <KPICard title="Gasto Medio/Día" value={`${new Intl.NumberFormat('es-ES').format(stats.kpis.dailyAvg)}€`} icon={<Zap className="text-amber-500" />} />
                    <KPICard title="Top Categoría" value={stats.kpis.topCategory} icon={<TrendingDown className="text-rose-500" />} isText />
                    <KPICard title="Mejor Mes" value={stats.kpis.bestMonth} icon={<TrendingUp className="text-emerald-500" />} isText />
                </div>

                {/* 1. Evolution */}
                <ChartCard title="Evolución Patrimonial" subtitle="Crecimiento neto acumulado">
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={stats.netWorthData}>
                            <defs>
                                <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                            <Tooltip
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
                                formatter={(val: number) => [`${val.toFixed(2)}€`, 'Patrimonio']}
                            />
                            <Area type="monotone" dataKey="netWorth" stroke="#6366f1" fillOpacity={1} fill="url(#colorNetWorth)" strokeWidth={3} />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* 2. Expenses Distribution */}
                <ChartCard title="Distribución de Gastos" subtitle="Porcentaje por categoría">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <div className="w-full h-[300px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {stats.pieData.map((entry: any) => (
                                            <Cell key={entry.name} fill={COLORS[stats.pieData.findIndex((e: any) => e.name === entry.name) % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
                                        formatter={(val: number) => [`${val.toFixed(2)}€`, '']}
                                    />
                                </PieChart>
                            </ResponsiveContainer>

                            {/* Center Label */}
                            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                                <span className="text-xs font-bold text-neutral-400 uppercase">Total Gastado</span>
                                <span className="text-2xl font-black text-neutral-900">{new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(stats.kpis.totalExpense)}€</span>
                            </div>
                        </div>

                        <div className="w-full md:w-1/2 grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2">
                            {stats.pieData.map((item: any, i: number) => (
                                <div key={item.name} className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-neutral-50 transition-colors">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                        <span className="font-bold text-neutral-600 truncate">{item.name}</span>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className="font-black text-neutral-900 block">{new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(item.value)}€</span>
                                        <span className="text-[10px] text-neutral-400 font-medium">
                                            {((item.value / stats.kpis.totalExpense) * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </ChartCard>

                {/* 3. Income vs Expense */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <ChartCard title="Ingresos vs Gastos" subtitle="Balance mensual">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={stats.barData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
                                    formatter={(val: number) => [`${val.toFixed(0)}€`, '']}
                                />
                                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                                <Bar dataKey="income" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar dataKey="expense" name="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
                                <ReferenceLine y={0} stroke="#000" />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    {/* 4. Trends */}
                    <ChartCard title="Tendencias Top 5" subtitle="Evolución de gasto">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={stats.categoryTrends}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
                                />
                                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                                {stats.top5Names.map((name: string, i: number) => (
                                    <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>

            </div>
        </div>
    );
}

function ChartCard({ title, subtitle, children }: any) {
    return (
        <div className="bg-white rounded-4xl border border-neutral-100 p-8 shadow-sm print:break-inside-avoid">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-neutral-900">{title}</h3>
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{subtitle}</p>
            </div>
            {children}
        </div>
    );
}

function KPICard({ title, value, icon, isText = false }: any) {
    return (
        <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm flex flex-col justify-between print:break-inside-avoid">
            <div className="flex items-center gap-2 mb-3">
                {icon}
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none">{title}</span>
            </div>
            <p className={`font-black text-neutral-900 ${isText ? 'text-sm truncate' : 'text-xl'}`} title={isText ? value : undefined}>{value}</p>
        </div>
    );
}
