'use client';

import {
    X, Upload, AlertCircle, ChevronRight, ChevronLeft, Trash2, Check, FileSpreadsheet,
    ArrowLeftRight, RotateCcw, Ban, Sparkles
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { format, parse, isValid } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { createTransfer } from '@/lib/actions/transfers';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { useMemo, useRef, useState } from 'react';
import {
    guessCategoryName, findCategoryIdByName, isLikelyTransfer, isBizum,
} from '@/lib/utils/importCategorization';

type Account = { id: string; name: string };
type Category = { id: string; name: string; icon?: string; color?: string };

type TransactionPreview = {
    date: string;
    description: string;
    amount: number;
    type: 'expense' | 'income' | 'transfer';
    category_id: string;
    isTransfer: boolean;
    transferAccountId: string;
    /** 'out' = sale de la cuenta importada hacia transferAccountId; 'in' = entra desde transferAccountId */
    transferDirection: 'out' | 'in';
    isBizum: boolean;
    isDuplicate: boolean;
    skip: boolean;
};

type Props = {
    accounts: Account[];
    categories: Category[];
    onClose: () => void;
    onImportSuccess: () => void;
    /** Todas las cuentas del usuario, usadas para elegir cuenta destino en traspasos. Si no se pasa, se usa `accounts`. */
    allAccounts?: Account[];
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

export default function ImportTransactionsModal({ accounts, categories, onClose, onImportSuccess, allAccounts }: Props) {
    const supabase = createClient();
    const destinationAccounts = allAccounts || accounts;
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
    const [loading, setLoading] = useState(false);
    const [detectedBank, setDetectedBank] = useState<string | null>(null);

    const [headers, setHeaders] = useState<string[]>([]);
    const [rawData, setRawData] = useState<any[]>([]);
    const [mapping, setMapping] = useState({ date: '', description: '', amount: '' });

    const [previews, setPreviews] = useState<TransactionPreview[]>([]);
    const [importing, setImporting] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'review'>('all');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) processFile(selectedFile);
    };

    const processFile = (file: File) => {
        setLoading(true);
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
            setLoading(false);
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
            // Histórico de descripciones ya categorizadas por el usuario (aprendizaje simple)
            const { data: existingTx } = await supabase
                .from('transactions')
                .select('description, category_id, amount, transaction_date')
                .eq('account_id', selectedAccountId)
                .limit(1000);

            const descMap = new Map<string, string>();
            existingTx?.forEach(t => {
                if (t.description && t.category_id) descMap.set(t.description.toLowerCase(), t.category_id);
            });

            // Firma "fecha|importe|descripcion" del histórico, para detectar duplicados exactos
            const existingSignatures = new Set(
                (existingTx || []).map(t => `${(t.transaction_date || '').slice(0, 10)}|${Math.abs(t.amount)}|${(t.description || '').toLowerCase().trim()}`)
            );

            const dateIdx = hdrs.findIndex(h => h.toLowerCase() === map.date.toLowerCase());
            const descIdx = hdrs.findIndex(h => h.toLowerCase() === map.description.toLowerCase());
            const amountIdx = hdrs.findIndex(h => h.toLowerCase() === map.amount.toLowerCase());

            const newPreviews: TransactionPreview[] = data
                .filter(row => Array.isArray(row) && row.length > Math.max(dateIdx, descIdx, amountIdx))
                .map(row => {
                    const amount = parseAmount(amountIdx >= 0 ? row[amountIdx] : null);
                    const description = (descIdx >= 0 ? (row[descIdx] || '').toString().trim() : '') || 'Sin descripción';
                    const date = parseDate(dateIdx >= 0 ? row[dateIdx] : null);
                    const descLower = description.toLowerCase();

                    const transferCandidate = isLikelyTransfer(description);
                    const bizum = isBizum(description);

                    // 1) Reglas de palabras clave por comercio/tipo de movimiento (incluye
                    //    categorías propias de traspaso como Redondeo/Aportacion mensual/Transferencia)
                    // 2) Histórico de transacciones ya categorizadas manualmente por el usuario
                    // 3) Sin categorizar (el usuario decide en el preview)
                    let categoryId = '';
                    const guessedName = guessCategoryName(description);
                    if (guessedName) {
                        categoryId = findCategoryIdByName(categories, guessedName) || '';
                    }
                    if (!categoryId && !bizum && !transferCandidate) {
                        for (const [key, catId] of descMap.entries()) {
                            if (descLower.includes(key) || key.includes(descLower)) {
                                categoryId = catId;
                                break;
                            }
                        }
                    }

                    const signature = `${date}|${Math.abs(amount)}|${descLower.trim()}`;

                    return {
                        date,
                        description,
                        amount: Math.abs(amount),
                        type: transferCandidate ? 'transfer' as const : (amount >= 0 ? 'income' as const : 'expense' as const),
                        category_id: categoryId,
                        isTransfer: transferCandidate,
                        transferAccountId: '',
                        // importe negativo = sale de esta cuenta ("out"); positivo = entra a esta cuenta ("in")
                        transferDirection: amount < 0 ? 'out' as const : 'in' as const,
                        isBizum: bizum,
                        isDuplicate: existingSignatures.has(signature),
                        skip: existingSignatures.has(signature),
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

    const updatePreview = (idx: number, patch: Partial<TransactionPreview>) => {
        setPreviews(prev => prev.map((p, i) => i === idx ? { ...p, ...patch } : p));
    };

    const toggleTransfer = (idx: number) => {
        setPreviews(prev => prev.map((p, i) => {
            if (i !== idx) return p;
            const isTransfer = !p.isTransfer;
            return {
                ...p,
                isTransfer,
                type: isTransfer ? 'transfer' : (p.type === 'transfer' ? 'expense' : p.type),
            };
        }));
    };

    // Aplica una misma cuenta destino a todas las filas de traspaso que aún no la tengan
    // (útil para el redondeo automático, que genera muchas filas idénticas)
    const applyAccountToAllTransfers = (accountId: string) => {
        setPreviews(prev => prev.map(p => p.isTransfer && !p.skip ? { ...p, transferAccountId: accountId } : p));
    };

    const stats = useMemo(() => {
        const active = previews.filter(p => !p.skip);
        return {
            income: active.filter(p => p.type === 'income').reduce((s, p) => s + p.amount, 0),
            expense: active.filter(p => p.type === 'expense').reduce((s, p) => s + p.amount, 0),
            transfers: active.filter(p => p.type === 'transfer').length,
            needsReview: active.filter(p => p.type !== 'transfer' && !p.category_id).length,
            duplicates: previews.filter(p => p.isDuplicate).length,
        };
    }, [previews]);

    const visiblePreviews = useMemo(() => {
        if (filter === 'all') return previews;
        return previews.filter(p => p.isDuplicate || (p.type !== 'transfer' && !p.category_id) || (p.isTransfer && !p.transferAccountId));
    }, [previews, filter]);

    const handleImport = async () => {
        setImporting(true);
        setImportError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const toImport = previews.filter(p => !p.skip);

            const transferRows = toImport.filter(p => p.isTransfer && p.transferAccountId);
            const normalRows = toImport.filter(p => !(p.isTransfer && p.transferAccountId));

            if (normalRows.length > 0) {
                const toInsert = normalRows.map(p => ({
                    user_id: user.id,
                    account_id: selectedAccountId,
                    category_id: p.category_id || null,
                    amount: p.amount,
                    // fila marcada como traspaso pero sin cuenta destino elegida: se importa
                    // según el signo original en vez de bloquear la importación
                    type: p.type === 'transfer' ? (p.transferDirection === 'out' ? 'expense' : 'income') : p.type,
                    description: p.description,
                    transaction_date: p.date,
                }));
                const { error } = await supabase.from('transactions').insert(toInsert);
                if (error) throw error;
            }

            for (const p of transferRows) {
                // 'out': sale de la cuenta importada hacia la elegida. 'in': entra desde la elegida.
                const fromAccountId = p.transferDirection === 'out' ? selectedAccountId : p.transferAccountId;
                const toAccountId = p.transferDirection === 'out' ? p.transferAccountId : selectedAccountId;
                const result = await createTransfer({
                    fromAccountId,
                    toAccountId,
                    amount: p.amount,
                    description: p.description,
                    transactionDate: p.date,
                    categoryId: p.category_id || undefined,
                });
                if (result.error) throw new Error(result.error);
            }

            onImportSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            setImportError(err.message || 'Error al importar');
        } finally {
            setImporting(false);
        }
    };

    const activeCount = previews.filter(p => !p.skip).length;

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-lg md:max-w-3xl mx-0 md:mx-4 bg-white rounded-t-2xl md:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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

                            <div className="space-y-3 md:grid md:grid-cols-3 md:gap-3 md:space-y-0">
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
                                <p className="text-sm font-semibold text-neutral-900">{activeCount} de {previews.length} movimientos</p>
                                <button onClick={() => setStep(2)} className="text-xs font-medium text-neutral-400 hover:text-neutral-700">
                                    Editar mapeo
                                </button>
                            </div>

                            {/* Summary */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
                                    <p className="text-[10px] text-emerald-600 font-semibold uppercase">Ingresos</p>
                                    <p className="text-sm font-bold text-emerald-700">+{stats.income.toFixed(2)}€</p>
                                </div>
                                <div className="bg-rose-50 rounded-xl p-3 text-center border border-rose-100">
                                    <p className="text-[10px] text-rose-600 font-semibold uppercase">Gastos</p>
                                    <p className="text-sm font-bold text-rose-700">-{stats.expense.toFixed(2)}€</p>
                                </div>
                                <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                                    <p className="text-[10px] text-blue-600 font-semibold uppercase">Traspasos</p>
                                    <p className="text-sm font-bold text-blue-700">{stats.transfers}</p>
                                </div>
                                <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
                                    <p className="text-[10px] text-amber-600 font-semibold uppercase">Por revisar</p>
                                    <p className="text-sm font-bold text-amber-700">{stats.needsReview}</p>
                                </div>
                            </div>

                            {/* Filter tabs */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setFilter('all')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === 'all' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500'}`}
                                >
                                    Todos ({previews.length})
                                </button>
                                <button
                                    onClick={() => setFilter('review')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${filter === 'review' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700'}`}
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Por revisar ({stats.needsReview + previews.filter(p => p.isTransfer && !p.transferAccountId).length})
                                </button>
                            </div>

                            {/* Bulk destination account for transfer rows (redondeo, aportaciones...) */}
                            {stats.transfers > 0 && (
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-2.5 flex items-center gap-2 flex-wrap">
                                    <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                    <p className="text-[11px] font-medium text-blue-700 shrink-0">Aplicar cuenta a los {stats.transfers} traspasos:</p>
                                    <select
                                        onChange={(e) => e.target.value && applyAccountToAllTransfers(e.target.value)}
                                        defaultValue=""
                                        className="text-[11px] font-medium rounded-lg px-2 py-1 border border-blue-200 bg-white text-blue-700 flex-1 min-w-[140px]"
                                    >
                                        <option value="">Elige cuenta...</option>
                                        {destinationAccounts.filter(a => a.id !== selectedAccountId).map(a => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* List */}
                            <div className="space-y-1.5 max-h-[42vh] overflow-y-auto">
                                {visiblePreviews.length === 0 && (
                                    <p className="text-center text-xs text-neutral-400 py-6">Nada que revisar aquí 🎉</p>
                                )}
                                {visiblePreviews.map((p) => {
                                    const idx = previews.indexOf(p);
                                    const category = categories.find(c => c.id === p.category_id);
                                    const needsCategory = p.type !== 'transfer' && !p.category_id;
                                    const needsAccount = p.isTransfer && !p.transferAccountId;

                                    return (
                                        <div
                                            key={idx}
                                            className={`p-2.5 rounded-xl border transition-all ${
                                                p.skip ? 'bg-neutral-50 border-neutral-100 opacity-50' :
                                                needsCategory || needsAccount ? 'bg-amber-50/60 border-amber-200' :
                                                'bg-neutral-50 border-transparent hover:border-neutral-200 hover:bg-white'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 border border-neutral-100">
                                                    {p.isTransfer ? (
                                                        <ArrowLeftRight className="w-4 h-4 text-blue-500" />
                                                    ) : (
                                                        <CategoryIcon
                                                            name={category?.icon}
                                                            className="w-4 h-4"
                                                            style={{ color: category?.color }}
                                                        />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="text-xs font-medium text-neutral-900 truncate">{p.description}</p>
                                                        {p.isBizum && !p.isTransfer && (
                                                            <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded shrink-0">BIZUM</span>
                                                        )}
                                                        {p.isDuplicate && (
                                                            <span className="text-[9px] font-bold text-neutral-500 bg-neutral-200 px-1.5 py-0.5 rounded shrink-0">DUPLICADO</span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-neutral-400">{p.date}</p>
                                                </div>
                                                <p className={`text-xs font-bold shrink-0 ${p.type === 'income' ? 'text-emerald-600' : p.type === 'transfer' ? 'text-blue-600' : 'text-neutral-900'}`}>
                                                    {p.type === 'income' ? '+' : p.type === 'transfer' ? '' : '-'}{p.amount.toFixed(2)}€
                                                </p>
                                                <button
                                                    onClick={() => updatePreview(idx, { skip: !p.skip })}
                                                    title={p.skip ? 'Incluir' : 'Excluir de la importación'}
                                                    className={`p-1.5 rounded-lg shrink-0 transition-all ${p.skip ? 'text-emerald-600 hover:bg-emerald-50' : 'text-neutral-300 hover:text-rose-500 hover:bg-rose-50'}`}
                                                >
                                                    {p.skip ? <RotateCcw className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                </button>
                                            </div>

                                            {!p.skip && (
                                                <div className="mt-2 pl-[42px] flex flex-wrap items-center gap-1.5">
                                                    <button
                                                        onClick={() => toggleTransfer(idx)}
                                                        className={`text-[10px] font-semibold px-2 py-1 rounded-lg flex items-center gap-1 transition-colors ${
                                                            p.isTransfer ? 'bg-blue-600 text-white' : 'bg-white border border-neutral-200 text-neutral-500'
                                                        }`}
                                                    >
                                                        <ArrowLeftRight className="w-3 h-3" /> Traspaso
                                                    </button>

                                                    <select
                                                        value={p.category_id}
                                                        onChange={(e) => updatePreview(idx, { category_id: e.target.value })}
                                                        className={`text-[11px] font-medium rounded-lg px-2 py-1 border ${needsCategory ? 'border-amber-300 bg-white text-amber-700' : 'border-neutral-200 bg-white text-neutral-600'}`}
                                                    >
                                                        <option value="">Sin categoría...</option>
                                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>

                                                    {p.isTransfer ? (
                                                        <>
                                                            <button
                                                                onClick={() => updatePreview(idx, { transferDirection: p.transferDirection === 'out' ? 'in' : 'out' })}
                                                                title="Cambiar dirección del traspaso"
                                                                className="text-[10px] font-semibold px-2 py-1 rounded-lg border border-neutral-200 bg-white text-neutral-500"
                                                            >
                                                                {p.transferDirection === 'out' ? 'Sale de esta cuenta' : 'Entra a esta cuenta'}
                                                            </button>
                                                            <select
                                                                value={p.transferAccountId}
                                                                onChange={(e) => updatePreview(idx, { transferAccountId: e.target.value })}
                                                                className={`text-[11px] font-medium rounded-lg px-2 py-1 border ${needsAccount ? 'border-amber-300 bg-white text-amber-700' : 'border-neutral-200 bg-white text-neutral-600'}`}
                                                            >
                                                                <option value="">{p.transferDirection === 'out' ? 'Cuenta destino...' : 'Cuenta origen...'}</option>
                                                                {destinationAccounts.filter(a => a.id !== selectedAccountId).map(a => (
                                                                    <option key={a.id} value={a.id}>{a.name}</option>
                                                                ))}
                                                            </select>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => updatePreview(idx, { type: p.type === 'income' ? 'expense' : 'income' })}
                                                            className="text-[10px] font-semibold px-2 py-1 rounded-lg border border-neutral-200 bg-white text-neutral-500"
                                                        >
                                                            Marcar como {p.type === 'income' ? 'gasto' : 'ingreso'}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {importError && (
                                <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                    <p className="text-xs text-rose-700 font-medium">{importError}</p>
                                </div>
                            )}

                            <button
                                onClick={handleImport}
                                disabled={importing || activeCount === 0}
                                className="w-full py-3.5 bg-neutral-900 text-white rounded-xl font-semibold text-sm disabled:bg-neutral-200 disabled:text-neutral-400 transition-colors"
                            >
                                {importing ? 'Importando...' : `Importar ${activeCount} movimientos`}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
