'use client';

import { useRef, useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import ReportView from './ReportView';

type Props = {
    data: {
        userName: string;
        totalBalance: number;
        monthlyIncome: number;
        monthlyExpense: number;
        accounts: any[];
        budgets: any[];
        monthlySeries: any[];
        monthlyData: any;
    };
};

export default function ExportButton({ data }: Props) {
    const [loading, setLoading] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    const handleExport = async () => {
        if (!reportRef.current) return;

        setLoading(true);

        try {
            // Wait for render and fonts
            await new Promise(resolve => setTimeout(resolve, 500));

            const dataUrl = await toPng(reportRef.current, {
                quality: 0.95,
                backgroundColor: '#ffffff',
                pixelRatio: 2 // Higher resolution
            });

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 210; // A4 width in mm
            const imgHeight = (reportRef.current.offsetHeight * imgWidth) / reportRef.current.offsetWidth;

            pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`FinTek_Reporte_${new Date().toISOString().split('T')[0]}.pdf`);

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Hubo un error al generar el PDF.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={handleExport}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <FileDown className="h-4 w-4" />
                )}
                {loading ? 'Generando...' : 'Exportar PDF'}
            </button>

            {/* Hidden Report View */}
            <div style={{ position: 'fixed', top: 0, left: 0, zIndex: -50, opacity: 0, pointerEvents: 'none' }}>
                <ReportView ref={reportRef} {...data} />
            </div>
        </>
    );
}
