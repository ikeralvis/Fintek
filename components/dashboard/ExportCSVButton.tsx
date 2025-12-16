'use client';

import { Download } from 'lucide-react';

type Props = {
    monthlyData: Record<number, { income: number; expense: number }>;
    year: number;
};

export default function ExportCSVButton({ monthlyData, year }: Props) {
    const handleExport = () => {
        const headers = ['Mes', 'Ingresos', 'Gastos', 'Balance'];
        const rows = Object.entries(monthlyData).map(([monthIndex, data]) => {
            const monthName = new Date(year, Number.parseInt(monthIndex)).toLocaleString('es-ES', { month: 'long' });
            const balance = data.income - data.expense;
            return [
                monthName.charAt(0).toUpperCase() + monthName.slice(1),
                data.income.toFixed(2),
                data.expense.toFixed(2),
                balance.toFixed(2)
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `Resumen_Financiero_${year}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    return (
        <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors font-medium shadow-sm"
        >
            <Download className="h-4 w-4" />
            Exportar CSV
        </button>
    );
}
