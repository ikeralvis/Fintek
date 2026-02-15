'use client';

import {
    X, Upload, AlertCircle,
    ChevronRight, Database, Trash2
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { format, parse, isValid } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { useRef, useState } from 'react';

type Account = {
    id: string;
    name: string;
};

type Category = {
    id: string;
    name: string;
    icon?: string;
    color?: string;
};

type TransactionPreview = {
    date: string;
    description: string;
    amount: number;
    type: 'expense' | 'income';
    category_id: string;
    status: 'valid' | 'invalid' | 'duplicate';
};

type Props = {
    accounts: Account[];
    categories: Category[];
    onClose: () => void;
    onImportSuccess: () => void;
};

export default function ImportTransactionsModal({ accounts, categories, onClose, onImportSuccess }: Props) {
    const supabase = createClient();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
    const [file, setFile] = useState<File | null>(null);
    console.log('Selected file:', file?.name); // Use variable to avoid lint
    const [loading, setLoading] = useState(false);

    // Parsing & Mapping
    const [headers, setHeaders] = useState<string[]>([]);
    const [rawData, setRawData] = useState<any[]>([]);
    const [mapping, setMapping] = useState({
        date: '',
        description: '',
        amount: '',
        type: '' // Optional if amounts have signs
    });

    // Preview
    const [previews, setPreviews] = useState<TransactionPreview[]>([]);
    const [importing, setImporting] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            processFile(selectedFile);
        }
    };

    const processFile = (file: File) => {
        const reader = new FileReader();
        if (file.name.endsWith('.csv')) {
            Papa.parse(file, {
                header: false,
                skipEmptyLines: true,
                complete: (results) => {
                    // Find header row (it's the first row that has something that looks like headers)
                    // Some banks have junk at the top
                    let headerIndex = 0;
                    for (let i = 0; i < results.data.length; i++) {
                        const row = results.data[i] as string[];
                        if (row.some(cell => /fecha|concepto|importe|description|amount|date/i.test(cell))) {
                            headerIndex = i;
                            break;
                        }
                    }

                    const rows = results.data as any[][];
                    setHeaders(rows[headerIndex] || []);
                    setRawData(rows.slice(headerIndex + 1));
                    setStep(2);
                }
            });
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            reader.onload = (e) => {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

                let headerIndex = 0;
                for (let i = 0; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (row && row.some(cell => typeof cell === 'string' && /fecha|concepto|importe|description|amount|date/i.test(cell))) {
                        headerIndex = i;
                        break;
                    }
                }

                setHeaders(jsonData[headerIndex] || []);
                setRawData(jsonData.slice(headerIndex + 1));
                setStep(2);
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const parseAmount = (val: any) => {
        if (typeof val === 'number') return val;
        if (typeof val !== 'string') return 0;
        // Handle Spanish format: 1.234,56 -> 1234.56
        const clean = val.replaceAll('.', '').replace(',', '.');
        return Number.parseFloat(clean) || 0;
    };

    const parseDate = (val: any) => {
        if (!val) return new Date().toISOString();
        if (typeof val === 'string') {
            // Try common formats
            const formats = ['dd/MM/yyyy', 'yyyy-MM-dd', 'dd-MM-yyyy', 'MM/dd/yyyy'];
            for (const f of formats) {
                const d = parse(val, f, new Date());
                if (isValid(d)) return d.toISOString();
            }
        }
        // XLSX date serial
        if (typeof val === 'number') {
            return new Date((val - 25569) * 86400 * 1000).toISOString();
        }
        return new Date().toISOString();
    };

    const generatePreviews = async () => {
        setLoading(true);
        try {
            // Get existing transactions for auto-categorization
            const { data: existingTx } = await supabase
                .from('transactions')
                .select('description, category_id')
                .limit(500);

            const descMap = new Map();
            existingTx?.forEach(t => descMap.set(t.description.toLowerCase(), t.category_id));

            const newPreviews: TransactionPreview[] = rawData.map(row => {
                const dateIdx = headers.indexOf(mapping.date);
                const descIdx = headers.indexOf(mapping.description);
                const amountIdx = headers.indexOf(mapping.amount);

                const amount = parseAmount(row[amountIdx]);
                const description = row[descIdx] || 'Sin descripción';
                const date = parseDate(row[dateIdx]);

                // Simple auto-categorizer
                let categoryId = 'deef3632-4d0f-48d6-96a2-e6e2f1dbb0b6'; // Default General
                for (const [desc, cat] of descMap.entries()) {
                    if (description.toLowerCase().includes(desc) || desc.includes(description.toLowerCase())) {
                        categoryId = cat;
                        break;
                    }
                }

                return {
                    date,
                    description,
                    amount: Math.abs(amount),
                    type: (amount >= 0 ? 'income' : 'expense') as 'income' | 'expense',
                    category_id: categoryId,
                    status: 'valid' as const
                };
            }).filter(p => !isNaN(p.amount) && p.amount !== 0);

            setPreviews(newPreviews);
            setStep(3);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async () => {
        setImporting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Batch insert
            const toInsert = previews.map(p => ({
                user_id: user.id,
                account_id: selectedAccountId,
                category_id: p.category_id,
                amount: p.amount,
                type: p.type,
                description: p.description,
                transaction_date: p.date
            }));

            // El trigger de la BD actualiza el balance automáticamente
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-[32px] w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-neutral-900">Importar Transacciones</h2>
                        <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider">
                            Paso {step} de 3 {step === 1 ? '· Carga de Archivo' : step === 2 ? '· Mapeo de Columnas' : '· Revisar Datos'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-xl transition-colors">
                        <X className="w-6 h-6 text-neutral-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {step === 1 && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                            {/* Account Selector */}
                            <div>
                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3 block">1. Selecciona la Cuenta de destino</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {accounts.map(acc => (
                                        <button
                                            key={acc.id}
                                            onClick={() => setSelectedAccountId(acc.id)}
                                            className={`p-4 rounded-2xl border-2 text-left transition-all ${selectedAccountId === acc.id ? 'border-neutral-900 bg-neutral-900 text-white shadow-lg' : 'border-neutral-100 bg-white text-neutral-600 hover:border-neutral-200'}`}
                                        >
                                            <p className="font-bold">{acc.name}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Dropzone */}
                            <div>
                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3 block">2. Sube tu extracto (CSV o Excel)</label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-neutral-200 rounded-[32px] p-12 flex flex-col items-center justify-center gap-4 hover:bg-neutral-50 hover:border-neutral-300 transition-all cursor-pointer group"
                                >
                                    <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Upload className="w-8 h-8 text-neutral-400" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-neutral-900">Haz clic para subir o arrastra un archivo</p>
                                        <p className="text-sm text-neutral-500">Soportamos CSV, XLS y XLSX</p>
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
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                                <p className="text-sm text-amber-800 font-medium">Hemos detectado {rawData.length} filas. Por favor, indica qué columna corresponde a cada dato.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-neutral-500 uppercase mb-2 block">Fecha</label>
                                        <select
                                            value={mapping.date}
                                            onChange={(e) => setMapping({ ...mapping, date: e.target.value })}
                                            className="w-full p-3 bg-neutral-100 border-none rounded-xl font-bold"
                                        >
                                            <option value="">Selecciona columna...</option>
                                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-neutral-500 uppercase mb-2 block">Concepto / Descripción</label>
                                        <select
                                            value={mapping.description}
                                            onChange={(e) => setMapping({ ...mapping, description: e.target.value })}
                                            className="w-full p-3 bg-neutral-100 border-none rounded-xl font-bold"
                                        >
                                            <option value="">Selecciona columna...</option>
                                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-neutral-500 uppercase mb-2 block">Importe</label>
                                        <select
                                            value={mapping.amount}
                                            onChange={(e) => setMapping({ ...mapping, amount: e.target.value })}
                                            className="w-full p-3 bg-neutral-100 border-none rounded-xl font-bold"
                                        >
                                            <option value="">Selecciona columna...</option>
                                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="bg-neutral-50 rounded-2xl p-4 overflow-hidden border border-neutral-100">
                                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">Vista Previa Original</p>
                                    <div className="space-y-2 overflow-x-auto">
                                        <table className="w-full text-[10px] font-medium text-neutral-600">
                                            <thead>
                                                <tr>
                                                    {headers.map((h, i) => <th key={`${h}-${i}`} className="text-left p-1 border-b border-neutral-200">{h}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rawData.slice(0, 3).map((row, ri) => (
                                                    <tr key={ri}>
                                                        {row.map((cell: any, ci: number) => <td key={ci} className="p-1 truncate max-w-[100px]">{cell?.toString()}</td>)}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={generatePreviews}
                                disabled={!mapping.date || !mapping.description || !mapping.amount || loading}
                                className="w-full bg-neutral-900 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-neutral-900/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? 'Procesando...' : 'Continuar'}
                                {!loading && <ChevronRight className="w-5 h-5" />}
                            </button>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-neutral-900">{previews.length} transacciones detectadas</h3>
                                <button onClick={() => setStep(2)} className="text-sm font-bold text-neutral-500 hover:text-neutral-900">Editar mapeo</button>
                            </div>

                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {previews.map((p, i) => (
                                    <div key={i} className="bg-neutral-50 rounded-2xl p-4 flex items-center gap-4 group hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-neutral-100">
                                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
                                            <CategoryIcon
                                                name={categories.find(c => c.id === p.category_id)?.icon}
                                                className="w-5 h-5"
                                                style={{ color: categories.find(c => c.id === p.category_id)?.color }}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <p className="font-bold text-neutral-900 truncate text-sm">{p.description}</p>
                                                <p className={`font-bold text-sm ${p.type === 'income' ? 'text-emerald-600' : 'text-neutral-900'}`}>
                                                    {p.type === 'income' ? '+' : '-'}{p.amount.toFixed(2)}€
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 uppercase">
                                                <span>{format(new Date(p.date), 'dd/MM/yyyy')}</span>
                                                <span>•</span>
                                                <select
                                                    value={p.category_id}
                                                    onChange={(e) => {
                                                        const newPreviews = [...previews];
                                                        newPreviews[i].category_id = e.target.value;
                                                        setPreviews(newPreviews);
                                                    }}
                                                    className="bg-transparent border-none p-0 h-4 focus:ring-0 cursor-pointer hover:text-neutral-600"
                                                >
                                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setPreviews(previews.filter((_, idx) => idx !== i))}
                                            className="p-2 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-neutral-900 rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
                                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                                    <div>
                                        <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest mb-1">Total a Importar</p>
                                        <p className="text-3xl font-black">
                                            {previews.reduce((sum, p) => sum + (p.type === 'income' ? p.amount : -p.amount), 0).toFixed(2)}€
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleImport}
                                        disabled={importing || previews.length === 0}
                                        className="w-full sm:w-auto px-10 py-4 bg-white text-neutral-900 rounded-2xl font-black text-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-xl shadow-white/10"
                                    >
                                        {importing ? 'Importando...' : 'Confirmar Importación'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
