'use client';

import {
    X, Upload, AlertCircle, ChevronRight, Trash2, Check, FileSpreadsheet
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { format, parse, isValid } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { useRef, useState } from 'react';

type Account = { id: string; name: string };
type Category = { id: string; name: string; icon?: string; color?: string };

type TransactionPreview = {
    date: string;
    description: string;
    amount: number;
    type: 'expense' | 'income';
    category_id: string;
    status: 'valid' | 'invalid';
};

type Props = {
    accounts: Account[];
    categories: Category[];
    onClose: () => void;
    onImportSuccess: () => void;
};

type BankFormat = {
    name: string;
    dateCol: string;
    descCol: string;
    amountCol: string;
};

const KNOWN_FORMATS: { detect: (headers: string[]) => boolean; format: BankFormat }[] = [
    {
        detect: (h) => h.some(c => /fecha/i.test(c)) && h.some(c => /concepto/i.test(c)) && h.some(c => /importe/i.test(c)) && h.some(c => /saldo posterior/i.test(c)),
        format: { name: 'Laboral Kutxa', dateCol: 'Fecha', descCol: 'Concepto', amountCol: 'Importe' }
    },
    {
        detect: (h) => h.some(c => /fecha/i.test(c)) && h.some(c => /concepto/i.test(c)) && h.some(c => /importe/i.test(c)),
        format: { name: 'Kutxabank / Genérico', dateCol: 'fecha', descCol: 'concepto', amountCol: 'importe' }
    },
];

function autoDetectFormat(headers: string[]): BankFormat | null {
    const normalized = headers.map(h => (h || '').toString().trim());
    for (const known of KNOWN_FORMATS) {
        if (known.detect(normalized)) {
            const dateCol = normalized.find(h => /^fecha$/i.test(h)) || normalized.find(h => /fecha/i.test(h)) || '';
            const descCol = normalized.find(h => /concepto/i.test(h)) || '';
            const amountCol = normalized.find(h => /importe/i.test(h)) || '';
            return { name: known.format.name, dateCol, descCol, amountCol };
        }
    }
    return null;
}

export default function ImportTransactionsModal({ accounts, categories, onClose, onImportSuccess }: Props) {
    const supabase = createClient();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
    const [loading, setLoading] = useState(false);
    const [detectedBank, setDetectedBank] = useState<string | null>(null);

    const [headers, setHeaders] = useState<string[]>([]);
    const [rawData, setRawData] = useState<any[]>([]);
    const [mapping, setMapping] = useState({ date: '', description: '', amount: '' });

    const [previews, setPreviews] = useState<TransactionPreview[]>([]);
    const [importing, setImporting] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) processFile(selectedFile);
    };

    const processFile = (file: File) => {
        if (file.name.endsWith('.csv')) {
            Papa.parse(file, {
                header: false,
                skipEmptyLines: true,
                complete: (results) => {
                    const rows = results.data as string[][];
                    findHeadersAndData(rows);
                }
            });
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
                findHeadersAndData(jsonData);
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const findHeadersAndData = (rows: any[][]) => {
        let headerIndex = 0;
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
            const row = rows[i];
            if (row && row.some(cell => typeof cell === 'string' && /fecha|concepto|importe|date|amount/i.test(cell))) {
                headerIndex = i;
                break;
            }
        }

        const foundHeaders = (rows[headerIndex] || []).map((h: any) => (h || '').toString().trim());
        const data = rows.slice(headerIndex + 1).filter(row => row && row.length > 1);

        setHeaders(foundHeaders);
        setRawData(data);

        // Auto-detect bank format
        const detected = autoDetectFormat(foundHeaders);
        if (detected) {
            setDetectedBank(detected.name);
            setMapping({
                date: detected.dateCol,
                description: detected.descCol,
                amount: detected.amountCol,
            });
            // Skip step 2, go directly to preview
            generatePreviewsFromData(foundHeaders, data, {
                date: detected.dateCol,
                description: detected.descCol,
                amount: detected.amountCol,
            });
        } else {
            setStep(2);
        }
    };

    const parseAmount = (val: any) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        const str = val.toString().trim();
        const clean = str.replaceAll('.', '').replace(',', '.');
        return Number.parseFloat(clean) || 0;
    };

    const parseDate = (val: any) => {
        if (!val) return format(new Date(), 'yyyy-MM-dd');
        if (typeof val === 'number') {
            return format(new Date((val - 25569) * 86400 * 1000), 'yyyy-MM-dd');
        }
        const str = val.toString().trim();
        const formats = ['dd/MM/yyyy', 'yyyy-MM-dd', 'dd-MM-yyyy', 'dd/MM/yyyy HH:mm'];
        for (const f of formats) {
            const d = parse(str, f, new Date());
            if (isValid(d)) return format(d, 'yyyy-MM-dd');
        }
        return format(new Date(), 'yyyy-MM-dd');
    };

    const generatePreviewsFromData = async (hdrs: string[], data: any[][], map: { date: string; description: string; amount: string }) => {
        setLoading(true);
        try {
            const { data: existingTx } = await supabase
                .from('transactions')
                .select('description, category_id')
                .limit(500);

            const descMap = new Map<string, string>();
            existingTx?.forEach(t => {
                if (t.description && t.category_id) descMap.set(t.description.toLowerCase(), t.category_id);
            });

            const dateIdx = hdrs.findIndex(h => h.toLowerCase() === map.date.toLowerCase());
            const descIdx = hdrs.findIndex(h => h.toLowerCase() === map.description.toLowerCase());
            const amountIdx = hdrs.findIndex(h => h.toLowerCase() === map.amount.toLowerCase());

            const defaultCatId = categories[0]?.id || '';

            const newPreviews: TransactionPreview[] = data
                .filter(row => Array.isArray(row) && row.length > Math.max(dateIdx, descIdx, amountIdx))
                .map(row => {
                    const amount = parseAmount(amountIdx >= 0 ? row[amountIdx] : null);
                    const description = (descIdx >= 0 ? (row[descIdx] || '').toString().trim() : '') || 'Sin descripción';
                    const date = parseDate(dateIdx >= 0 ? row[dateIdx] : null);

                    let categoryId = defaultCatId;
                    const descLower = description.toLowerCase();
                    for (const [key, catId] of descMap.entries()) {
                        if (descLower.includes(key) || key.includes(descLower)) {
                            categoryId = catId;
                            break;
                        }
                    }

                    return {
                        date,
                        description,
                        amount: Math.abs(amount),
                        type: amount >= 0 ? 'income' as const : 'expense' as const,
                        category_id: categoryId,
                        status: 'valid' as const,
                    };
                })
                .filter(p => p.amount > 0);

            setPreviews(newPreviews);
            setStep(3);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const generatePreviews = () => {
        generatePreviewsFromData(headers, rawData, mapping);
    };

    const handleImport = async () => {
        setImporting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const toInsert = previews.map(p => ({
                user_id: user.id,
                account_id: selectedAccountId,
                category_id: p.category_id,
                amount: p.amount,
                type: p.type,
                description: p.description,
                transaction_date: p.date,
            }));

            const { error } = await supabase.from('transactions').insert(toInsert);
            if (error) throw error;

            onImportSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            alert('Error al importar');
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-lg mx-0 md:mx-4 bg-white rounded-t-2xl md:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-base font-semibold text-neutral-900">Importar Movimientos</h2>
                        <p className="text-xs text-neutral-400">
                            Paso {step}/3
                            {detectedBank && step === 3 && <span className="text-emerald-600 font-medium ml-1">· {detectedBank} detectado</span>}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-xl">
                        <X className="w-5 h-5 text-neutral-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                    {/* STEP 1: Account + File */}
                    {step === 1 && (
                        <div className="space-y-5">
                            <div>
                                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 block">Cuenta de destino</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {accounts.map(acc => (
                                        <button
                                            key={acc.id}
                                            onClick={() => setSelectedAccountId(acc.id)}
                                            className={`p-3 rounded-xl border text-left text-sm font-medium transition-all flex items-center gap-3 ${
                                                selectedAccountId === acc.id
                                                    ? 'border-neutral-900 bg-neutral-900 text-white'
                                                    : 'border-neutral-200 text-neutral-700 hover:border-neutral-300'
                                            }`}
                                        >
                                            {selectedAccountId === acc.id && <Check className="w-4 h-4 shrink-0" />}
                                            {acc.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 block">Archivo (CSV o Excel)</label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-neutral-200 rounded-2xl p-8 flex flex-col items-center gap-3 hover:bg-neutral-50 hover:border-neutral-300 transition-all cursor-pointer"
                                >
                                    <div className="w-12 h-12 bg-neutral-100 rounded-xl flex items-center justify-center">
                                        <FileSpreadsheet className="w-6 h-6 text-neutral-400" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-medium text-neutral-700">Subir extracto bancario</p>
                                        <p className="text-xs text-neutral-400 mt-1">CSV, XLS, XLSX · Kutxabank, Laboral Kutxa, etc.</p>
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        accept=".csv,.xlsx,.xls"
                                    />
                                </div>
                            </div>

                            {loading && (
                                <div className="text-center py-4">
                                    <div className="w-5 h-5 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin mx-auto" />
                                    <p className="text-xs text-neutral-400 mt-2">Analizando archivo...</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 2: Manual mapping (only if auto-detect fails) */}
                    {step === 2 && (
                        <div className="space-y-5">
                            <div className="bg-amber-50 rounded-xl p-3 flex items-start gap-2 border border-amber-100">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-800 font-medium">
                                    {rawData.length} filas detectadas. Indica qué columna corresponde a cada campo.
                                </p>
                            </div>

                            <div className="space-y-3">
                                {[
                                    { key: 'date', label: 'Fecha' },
                                    { key: 'description', label: 'Concepto' },
                                    { key: 'amount', label: 'Importe' },
                                ].map(({ key, label }) => (
                                    <div key={key}>
                                        <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1 block">{label}</label>
                                        <select
                                            value={(mapping as any)[key]}
                                            onChange={(e) => setMapping(prev => ({ ...prev, [key]: e.target.value }))}
                                            className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium"
                                        >
                                            <option value="">Selecciona columna...</option>
                                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>

                            {/* Preview of raw data */}
                            <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100 overflow-x-auto">
                                <p className="text-[10px] font-semibold text-neutral-400 uppercase mb-2">Vista previa</p>
                                <table className="w-full text-[10px] text-neutral-600">
                                    <thead>
                                        <tr>{headers.map((h, i) => <th key={i} className="text-left p-1 border-b border-neutral-200 font-semibold">{h}</th>)}</tr>
                                    </thead>
                                    <tbody>
                                        {rawData.slice(0, 3).map((row, ri) => (
                                            <tr key={ri}>
                                                {Array.isArray(row) && row.map((cell: any, ci: number) => (
                                                    <td key={ci} className="p-1 truncate max-w-[80px]">{cell != null ? String(cell) : ''}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <button
                                onClick={generatePreviews}
                                disabled={!mapping.date || !mapping.description || !mapping.amount || loading}
                                className="w-full py-3.5 bg-neutral-900 text-white rounded-xl font-semibold text-sm disabled:bg-neutral-200 disabled:text-neutral-400 transition-colors flex items-center justify-center gap-2"
                            >
                                {loading ? 'Procesando...' : 'Continuar'} {!loading && <ChevronRight className="w-4 h-4" />}
                            </button>
                        </div>
                    )}

                    {/* STEP 3: Preview + Import */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-neutral-900">{previews.length} movimientos</p>
                                <button onClick={() => setStep(2)} className="text-xs font-medium text-neutral-400 hover:text-neutral-700">
                                    Editar mapeo
                                </button>
                            </div>

                            {/* Summary */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
                                    <p className="text-[10px] text-emerald-600 font-semibold uppercase">Ingresos</p>
                                    <p className="text-sm font-bold text-emerald-700">
                                        +{previews.filter(p => p.type === 'income').reduce((s, p) => s + p.amount, 0).toFixed(2)}€
                                    </p>
                                </div>
                                <div className="bg-rose-50 rounded-xl p-3 text-center border border-rose-100">
                                    <p className="text-[10px] text-rose-600 font-semibold uppercase">Gastos</p>
                                    <p className="text-sm font-bold text-rose-700">
                                        -{previews.filter(p => p.type === 'expense').reduce((s, p) => s + p.amount, 0).toFixed(2)}€
                                    </p>
                                </div>
                            </div>

                            {/* List */}
                            <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
                                {previews.map((p, idx) => (
                                    <div key={`${p.date}-${p.description}-${idx}`} className="flex items-center gap-2.5 p-2.5 bg-neutral-50 rounded-xl group hover:bg-white hover:border-neutral-200 border border-transparent transition-all">
                                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 border border-neutral-100">
                                            <CategoryIcon
                                                name={categories.find(c => c.id === p.category_id)?.icon}
                                                className="w-4 h-4"
                                                style={{ color: categories.find(c => c.id === p.category_id)?.color }}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-neutral-900 truncate">{p.description}</p>
                                            <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                                                <span>{p.date}</span>
                                                <select
                                                    value={p.category_id}
                                                    onChange={(e) => {
                                                        const updated = [...previews];
                                                        updated[idx].category_id = e.target.value;
                                                        setPreviews(updated);
                                                    }}
                                                    className="bg-transparent border-none p-0 text-[10px] text-neutral-400 focus:ring-0 cursor-pointer"
                                                >
                                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <p className={`text-xs font-bold shrink-0 ${p.type === 'income' ? 'text-emerald-600' : 'text-neutral-900'}`}>
                                            {p.type === 'income' ? '+' : '-'}{p.amount.toFixed(2)}€
                                        </p>
                                        <button
                                            onClick={() => setPreviews(prev => prev.filter((_, i) => i !== idx))}
                                            className="p-1 text-neutral-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleImport}
                                disabled={importing || previews.length === 0}
                                className="w-full py-3.5 bg-neutral-900 text-white rounded-xl font-semibold text-sm disabled:bg-neutral-200 disabled:text-neutral-400 transition-colors"
                            >
                                {importing ? 'Importando...' : `Importar ${previews.length} movimientos`}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
