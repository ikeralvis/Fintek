import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { FileText } from 'lucide-react';
import SummaryFilters from '@/components/dashboard/SummaryFilters';
import SummaryCharts from '@/components/dashboard/SummaryCharts';
import MonthlyCategoryTable from '@/components/dashboard/MonthlyCategoryTable';
import { getSummaryData, getAvailableYears } from '@/lib/actions/summary';

type SearchParams = {
    year?: string;
    categoryId?: string;
};

export default async function ResumenPage({
    searchParams,
}: {
    searchParams: SearchParams;
}) {
    const supabase = await createClient();

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
    const currentYear = searchParams.year
        ? parseInt(searchParams.year)
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
        searchParams.categoryId
    );

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

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center space-x-3 mb-2">
                    <FileText className="h-8 w-8 text-primary-600" />
                    <h1 className="text-3xl font-bold text-neutral-900">Resumen Financiero</h1>
                </div>
                <p className="text-neutral-600">
                    Análisis detallado de tus finanzas en {currentYear}
                </p>
            </div>

            {/* Filtros */}
            <div className="mb-6">
                <SummaryFilters
                    availableYears={years}
                    categories={categories || []}
                    currentYear={currentYear}
                    currentCategoryId={searchParams.categoryId}
                />
            </div>

            {/* Resumen Anual */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-soft p-6">
                    <h3 className="text-sm font-medium text-neutral-600 mb-2">
                        Total Ingresos {currentYear}
                    </h3>
                    <p className="text-3xl font-bold text-secondary-600">
                        {new Intl.NumberFormat('es-ES', {
                            style: 'currency',
                            currency: 'EUR',
                        }).format(yearlyIncome)}
                    </p>
                </div>

                <div className="bg-white rounded-xl shadow-soft p-6">
                    <h3 className="text-sm font-medium text-neutral-600 mb-2">
                        Total Gastos {currentYear}
                    </h3>
                    <p className="text-3xl font-bold text-accent-600">
                        {new Intl.NumberFormat('es-ES', {
                            style: 'currency',
                            currency: 'EUR',
                        }).format(yearlyExpense)}
                    </p>
                </div>

                <div className="bg-white rounded-xl shadow-soft p-6">
                    <h3 className="text-sm font-medium text-neutral-600 mb-2">
                        Balance {currentYear}
                    </h3>
                    <p
                        className={`text-3xl font-bold ${yearlyBalance >= 0 ? 'text-primary-600' : 'text-accent-600'
                            }`}
                    >
                        {new Intl.NumberFormat('es-ES', {
                            style: 'currency',
                            currency: 'EUR',
                        }).format(yearlyBalance)}
                    </p>
                </div>
            </div>

            {/* Gráficos */}
            <div className="mb-8">
                <SummaryCharts monthlyData={monthlyData} />
            </div>

            {/* Tabla Mensual */}
            <div>
                <MonthlyCategoryTable
                    monthlyData={monthlyData}
                    categoryTotals={categoryTotals}
                />
            </div>

            {/* Info adicional */}
            <div className="mt-6 bg-primary-50 border border-primary-200 rounded-xl p-4">
                <p className="text-sm text-primary-800">
                    💡 <strong>Tip:</strong> Los valores positivos (verde) indican más ingresos que gastos. Los negativos (rojo) indican más gastos que ingresos.
                </p>
            </div>
        </div>
    );
}