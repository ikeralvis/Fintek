import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { FileText } from 'lucide-react';
import SummaryFilters from '@/components/dashboard/SummaryFilters';
import SummaryCharts from '@/components/dashboard/SummaryCharts';
import MonthlyCategoryTable from '@/components/dashboard/MonthlyCategoryTable';
import ExportButton from '@/components/dashboard/ExportButton';
import ExportCSVButton from '@/components/dashboard/ExportCSVButton';
import { getSummaryData, getAvailableYears } from '@/lib/actions/summary';
import { getBudgetProgress } from '@/lib/actions/budgets';

type SearchParams = {
    year?: string;
    categoryId?: string;
};

export default async function ResumenPage({
    searchParams,
}: Readonly<{
    searchParams: Promise<SearchParams>;
}>) {
    const supabase = await createClient();
    const resolvedSearchParams = await searchParams;

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Obtener años disponibles
    const { data: availableYears } = await getAvailableYears();
    const years = availableYears || [new Date().getFullYear()];

    // Año actual o del query param
    const currentYear = resolvedSearchParams.year
        ? Number.parseInt(resolvedSearchParams.year)
        : new Date().getFullYear();

    // Obtener categorías
    const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

    // Obtener datos del resumen
    const { data: summaryData } = await getSummaryData(
        currentYear,
        resolvedSearchParams.categoryId
    );

    // Obtener cuentas para el reporte
    const { data: accounts } = await supabase
        .from('accounts')
        .select('*, banks(name)')
        .eq('user_id', user.id);

    // Obtener presupuestos para el reporte
    const { data: budgets } = await getBudgetProgress();

    if (!summaryData) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="bg-white rounded-xl shadow-soft p-12 text-center">
                    <FileText className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-neutral-700 mb-2">
                        Error al cargar datos
                    </h2>
                    <p className="text-neutral-500">
                        No se pudieron cargar los datos del resumen
                    </p>
                </div>
            </div>
        );
    }

    const { monthlyData, categoryTotals } = summaryData;

    // Calcular totales del año
    const yearlyIncome = Object.values(monthlyData).reduce(
        (sum: number, month: any) => sum + month.income,
        0
    );
    const yearlyExpense = Object.values(monthlyData).reduce(
        (sum: number, month: any) => sum + month.expense,
        0
    );
    const yearlyBalance = yearlyIncome - yearlyExpense;

    // Datos para el reporte PDF
    const now = new Date();
    const currentMonthIndex = now.getMonth();
    const currentMonthData = monthlyData[currentMonthIndex] || { income: 0, expense: 0 };

    // Preparar series mensuales para el gráfico del reporte
    const monthlySeries = [];
    for (let m = 0; m < 12; m++) {
        const md = monthlyData[m] || { income: 0, expense: 0 };
        monthlySeries.push({ month: `${currentYear}-${String(m + 1).padStart(2, '0')}`, income: md.income || 0, expense: md.expense || 0 });
    }

    const reportData = {
        userName: user.user_metadata?.name || 'Usuario',
        totalBalance: accounts?.reduce((sum, acc) => sum + acc.current_balance, 0) || 0,
        monthlyIncome: currentMonthData.income,
        monthlyExpense: currentMonthData.expense,
        accounts: accounts || [],
        budgets: budgets || [],
        monthlySeries,
        monthlyData
    };

    return (
        <div className="container mx-auto px-4 py-12 max-w-7xl">
            {/* Header */}
            <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2.5 bg-teal-50 rounded-xl">
                            <FileText className="h-6 w-6 text-teal-600" />
                        </div>
                        <h1 className="text-4xl font-bold text-neutral-900 tracking-tight">Resumen Financiero</h1>
                    </div>
                    <p className="text-lg text-neutral-500 font-medium ml-12">
                        Análisis detallado de tus finanzas en {currentYear}
                    </p>
                </div>
                <div className="flex gap-2">
                    <ExportCSVButton monthlyData={monthlyData} year={currentYear} />
                    <ExportButton data={reportData} />
                </div>
            </div>

            {/* Filtros */}
            <div className="mb-8">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-card border border-white/50 p-4">
                    <SummaryFilters
                        availableYears={years}
                        categories={categories || []}
                        currentYear={currentYear}
                        currentCategoryId={resolvedSearchParams.categoryId}
                    />
                </div>
            </div>

            {/* Resumen Anual */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-card border border-white/50 p-6">
                    <h3 className="text-sm font-medium text-neutral-500 mb-2 uppercase tracking-wide">
                        Total Ingresos {currentYear}
                    </h3>
                    <p className="text-3xl font-bold text-emerald-600">
                        {new Intl.NumberFormat('es-ES', {
                            style: 'currency',
                            currency: 'EUR',
                        }).format(yearlyIncome)}
                    </p>
                </div>

                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-card border border-white/50 p-6">
                    <h3 className="text-sm font-medium text-neutral-500 mb-2 uppercase tracking-wide">
                        Total Gastos {currentYear}
                    </h3>
                    <p className="text-3xl font-bold text-rose-600">
                        {new Intl.NumberFormat('es-ES', {
                            style: 'currency',
                            currency: 'EUR',
                        }).format(yearlyExpense)}
                    </p>
                </div>

                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-card border border-white/50 p-6">
                    <h3 className="text-sm font-medium text-neutral-500 mb-2 uppercase tracking-wide">
                        Balance {currentYear}
                    </h3>
                    <p
                        className={`text-3xl font-bold ${yearlyBalance >= 0 ? 'text-blue-600' : 'text-rose-600'
                            }`}
                    >
                        {new Intl.NumberFormat('es-ES', {
                            style: 'currency',
                            currency: 'EUR',
                            signDisplay: 'always'
                        }).format(yearlyBalance)}
                    </p>
                </div>
            </div>

            {/* Gráficos */}
            <div className="mb-8 bg-white/80 backdrop-blur-xl rounded-3xl shadow-card border border-white/50 p-6">
                <SummaryCharts monthlyData={monthlyData} />
            </div>

            {/* Tabla Mensual */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-card border border-white/50 p-6 mb-8">
                <MonthlyCategoryTable
                    monthlyData={monthlyData}
                    categoryTotals={categoryTotals}
                />
            </div>

            {/* Info adicional */}
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-6 flex items-start space-x-3">
                <div className="p-2 bg-teal-100 rounded-full mt-0.5">
                    <FileText className="h-4 w-4 text-teal-700" />
                </div>
                <div>
                    <h4 className="font-bold text-teal-900 text-sm mb-1">Entendiendo tu reporte</h4>
                    <p className="text-sm text-teal-800">
                        Los valores positivos (verde) indican más ingresos que gastos. Los negativos (rojo) indican más gastos que ingresos.
                    </p>
                </div>
            </div>
        </div>
    );
}