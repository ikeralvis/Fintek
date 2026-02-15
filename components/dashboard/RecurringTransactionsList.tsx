'use client';

import { useState } from 'react';
import { createRecurringTransaction, deleteRecurringTransaction, processRecurringTransaction, updateRecurringTransaction } from '@/lib/actions/recurring';
import { Plus, Trash2, RefreshCw, Calendar, Play, Check, ChevronDown, ChevronUp, X, Edit2, MoreVertical } from 'lucide-react';
import CategoryIcon from '@/components/ui/CategoryIcon';

type Props = {
    recurringTransactions: any[];
    accounts: any[];
    categories: any[];
};

export default function RecurringTransactionsList({ recurringTransactions, accounts, categories }: Readonly<Props>) {
    const [isCreating, setIsCreating] = useState(false);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [menuOpen, setMenuOpen] = useState<string | null>(null);

    // Collapsible states
    const [isAccountsExpanded, setIsAccountsExpanded] = useState(false);
    const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
    const [isFrequencyExpanded, setIsFrequencyExpanded] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        type: 'expense',
        accountId: '',
        categoryId: '',
        amount: '',
        description: '',
        frequency: 'monthly',
        startDate: new Date().toISOString().split('T')[0],
    });

    const selectedCategory = categories.find(c => c.id === formData.categoryId);
    const selectedAccount = accounts.find(a => a.id === formData.accountId);

    // Agrupar cuentas por banco
    const groupedAccounts = accounts.reduce((acc: any, account) => {
        const bankName = account.banks?.name || 'Otros';
        if (!acc[bankName]) acc[bankName] = [];
        acc[bankName].push(account);
        return acc;
    }, {});

    const frequencyOptions = [
        { value: 'weekly', label: 'Semanal', icon: '📅' },
        { value: 'monthly', label: 'Mensual', icon: '📆' },
        { value: 'yearly', label: 'Anual', icon: '🗓️' },
    ];

    const selectedFrequency = frequencyOptions.find(f => f.value === formData.frequency);

    const handleSubmit = async () => {
        if (!formData.accountId || !formData.categoryId || !formData.amount) return;

        const dataToSave = {
            type: formData.type as 'income' | 'expense',
            accountId: formData.accountId,
            categoryId: formData.categoryId,
            amount: Number.parseFloat(formData.amount),
            description: formData.description,
            frequency: formData.frequency as 'monthly' | 'weekly' | 'yearly',
            startDate: formData.startDate,
        };

        const result = editingId 
            ? await updateRecurringTransaction(editingId, dataToSave)
            : await createRecurringTransaction(dataToSave);

        if (result.error) {
            alert(result.error);
            return;
        }

        setIsCreating(false);
        setEditingId(null);
        setFormData({
            type: 'expense',
            accountId: '',
            categoryId: '',
            amount: '',
            description: '',
            frequency: 'monthly',
            startDate: new Date().toISOString().split('T')[0],
        });
        setIsAccountsExpanded(false);
        setIsCategoriesExpanded(false);
        setIsFrequencyExpanded(false);
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar esta transacción recurrente?')) {
            await deleteRecurringTransaction(id);
        }
        setMenuOpen(null);
    };

    const handleEdit = (rt: any) => {
        setFormData({
            type: rt.type,
            accountId: rt.account_id,
            categoryId: rt.category_id,
            amount: rt.amount.toString(),
            description: rt.description || '',
            frequency: rt.frequency,
            startDate: rt.next_run_date.split('T')[0],
        });
        setEditingId(rt.id);
        setIsCreating(true);
        setMenuOpen(null);
    };

    const handleProcessNow = async (id: string) => {
        setIsProcessing(id);
        const result = await processRecurringTransaction(id);
        setIsProcessing(null);
        if (result.error) {
            alert(result.error);
        } else {
            alert('Transacción procesada correctamente');
        }
    };

    return (
        <div className="space-y-4">
            {/* Add Button */}
            {!isCreating && (
                <button
                    onClick={() => setIsCreating(true)}
                    className="w-full p-2.5 bg-neutral-900 rounded-xl text-white hover:bg-neutral-800 transition-colors shadow-lg flex items-center justify-center gap-2 font-bold"
                >
                    <Plus className="w-5 h-5" strokeWidth={2.5} />
                    Nueva Transacción Automática
                </button>
            )}

            {/* Form Modal */}
            {isCreating && (
                <div className="fixed inset-0 bg-white z-[100] flex flex-col animate-slide-up">
                    {/* Header */}
                    <div className="px-4 py-3 flex items-center justify-between border-b border-neutral-100">
                        <button
                            onClick={() => {
                                setIsCreating(false);
                                setEditingId(null);
                                setIsAccountsExpanded(false);
                                setIsCategoriesExpanded(false);
                                setIsFrequencyExpanded(false);
                            }}
                            className="p-2 rounded-full hover:bg-neutral-100 transition-colors"
                        >
                            <X className="w-5 h-5 text-neutral-900" />
                        </button>
                        <div className="flex bg-neutral-100 rounded-full p-0.5">
                            <button
                                onClick={() => setFormData({ ...formData, type: 'expense' })}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${formData.type === 'expense' ? 'bg-white text-rose-500 shadow-sm' : 'text-neutral-500'}`}
                            >
                                Gasto
                            </button>
                            <button
                                onClick={() => setFormData({ ...formData, type: 'income' })}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${formData.type === 'income' ? 'bg-white text-emerald-500 shadow-sm' : 'text-neutral-500'}`}
                            >
                                Ingreso
                            </button>
                        </div>
                        <div className="w-9" />
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
                            {/* AMOUNT INPUT */}
                            <div className="text-center py-4">
                                <div className="relative inline-flex items-center justify-center">
                                    <span className={`text-3xl font-bold mr-1 ${formData.type === 'expense' ? 'text-rose-300' : 'text-emerald-300'}`}>€</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        className={`bg-transparent text-5xl font-black placeholder-neutral-200 focus:outline-none w-full text-center max-w-[240px] ${formData.type === 'expense' ? 'text-rose-500' : 'text-emerald-500'}`}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* DESCRIPTION & DATE */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Descripción (ej: Aportación mensual)"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="flex-1 bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2.5 text-sm text-neutral-900 font-medium placeholder-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-200 outline-none"
                                />
                                <div className="relative">
                                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        className="bg-neutral-50 border border-neutral-100 rounded-xl pl-8 pr-2 py-2.5 text-sm text-neutral-900 font-medium outline-none w-[130px]"
                                    />
                                </div>
                            </div>

                            {/* FREQUENCY SELECTOR */}
                            <div className="bg-white border border-neutral-100 rounded-2xl overflow-hidden shadow-sm">
                                <button
                                    onClick={() => setIsFrequencyExpanded(!isFrequencyExpanded)}
                                    className="w-full p-3 flex items-center justify-between hover:bg-neutral-50 transition-colors"
                                >
                                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Frecuencia</span>
                                    <div className="flex items-center gap-2">
                                        {selectedFrequency && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{selectedFrequency.icon}</span>
                                                <span className="text-sm font-bold text-neutral-900">{selectedFrequency.label}</span>
                                            </div>
                                        )}
                                        {isFrequencyExpanded ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                                    </div>
                                </button>
                                {isFrequencyExpanded && (
                                    <div className="border-t border-neutral-100 p-2 space-y-1">
                                        {frequencyOptions.map((freq) => (
                                            <button
                                                key={freq.value}
                                                onClick={() => {
                                                    setFormData({ ...formData, frequency: freq.value });
                                                    setIsFrequencyExpanded(false);
                                                }}
                                                className={`w-full p-2.5 rounded-xl flex items-center gap-3 transition-all ${formData.frequency === freq.value ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-50'}`}
                                            >
                                                <span className="text-xl">{freq.icon}</span>
                                                <span className={`text-sm font-bold flex-1 text-left ${formData.frequency === freq.value ? 'text-white' : 'text-neutral-900'}`}>
                                                    {freq.label}
                                                </span>
                                                {formData.frequency === freq.value && <Check className="w-4 h-4 text-emerald-400" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ACCOUNT SELECTOR */}
                            <div className="bg-white border border-neutral-100 rounded-2xl overflow-hidden shadow-sm">
                                <button
                                    onClick={() => setIsAccountsExpanded(!isAccountsExpanded)}
                                    className="w-full p-3 flex items-center justify-between hover:bg-neutral-50 transition-colors"
                                >
                                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Cuenta</span>
                                    <div className="flex items-center gap-2">
                                        {selectedAccount && (
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-6 h-6 rounded-lg flex items-center justify-center text-[8px] font-bold text-white overflow-hidden"
                                                    style={{ backgroundColor: selectedAccount.banks?.logo_url ? 'transparent' : (selectedAccount.banks?.color || '#000') }}
                                                >
                                                    {selectedAccount.banks?.logo_url ? (
                                                        <img src={selectedAccount.banks.logo_url} alt="" className="w-full h-full object-contain" />
                                                    ) : (
                                                        selectedAccount.banks?.name?.substring(0, 2).toUpperCase() || '💰'
                                                    )}
                                                </div>
                                                <span className="text-sm font-bold text-neutral-900">{selectedAccount.name}</span>
                                            </div>
                                        )}
                                        {isAccountsExpanded ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                                    </div>
                                </button>
                                {isAccountsExpanded && (
                                    <div className="border-t border-neutral-100 p-2 space-y-2 max-h-48 overflow-y-auto">
                                        {Object.entries(groupedAccounts).map(([bankName, bankAccounts]: [string, any]) => (
                                            <div key={bankName}>
                                                <div className="px-2 py-1 text-xs font-bold text-neutral-400 uppercase tracking-wider">{bankName}</div>
                                                <div className="space-y-1">
                                                    {bankAccounts.map((acc: any) => (
                                                        <button
                                                            key={acc.id}
                                                            onClick={() => {
                                                                setFormData({ ...formData, accountId: acc.id });
                                                                setIsAccountsExpanded(false);
                                                            }}
                                                            className={`w-full p-2.5 rounded-xl flex items-center gap-3 transition-all ${formData.accountId === acc.id ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-50'}`}
                                                        >
                                                            <div
                                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0 overflow-hidden"
                                                                style={{ backgroundColor: acc.banks?.logo_url ? 'transparent' : (acc.banks?.color || '#000') }}
                                                            >
                                                                {acc.banks?.logo_url ? (
                                                                    <img src={acc.banks.logo_url} alt="" className="w-full h-full object-contain" />
                                                                ) : (
                                                                    acc.banks?.name?.substring(0, 2).toUpperCase() || '💰'
                                                                )}
                                                            </div>
                                                            <div className="flex-1 text-left min-w-0">
                                                                <p className={`text-sm font-bold truncate ${formData.accountId === acc.id ? 'text-white' : 'text-neutral-900'}`}>{acc.name}</p>
                                                                <p className={`text-xs ${formData.accountId === acc.id ? 'text-neutral-300' : 'text-neutral-500'}`}>
                                                                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(acc.current_balance)}
                                                                </p>
                                                            </div>
                                                            {formData.accountId === acc.id && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* CATEGORIES */}
                            <div className="bg-white border border-neutral-100 rounded-2xl overflow-hidden shadow-sm">
                                <button
                                    onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
                                    className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
                                >
                                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Categoría</span>
                                    <div className="flex items-center gap-2">
                                        {selectedCategory && (
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                                                    style={{ backgroundColor: selectedCategory.color ? `${selectedCategory.color}20` : '#f5f5f5' }}
                                                >
                                                    <CategoryIcon 
                                                        name={selectedCategory.icon} 
                                                        className="w-4 h-4" 
                                                        style={{ color: selectedCategory.color || '#666' }} 
                                                    />
                                                </div>
                                                <span className="text-sm font-bold text-neutral-900">{selectedCategory.name}</span>
                                            </div>
                                        )}
                                        {isCategoriesExpanded ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                                    </div>
                                </button>
                                {isCategoriesExpanded && (
                                    <div className="border-t border-neutral-100 p-3 max-h-72 overflow-y-auto">
                                        <div className="grid grid-cols-4 gap-2">
                                            {categories.map(cat => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => {
                                                        setFormData({ ...formData, categoryId: cat.id });
                                                        setIsCategoriesExpanded(false);
                                                    }}
                                                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${formData.categoryId === cat.id ? 'bg-neutral-900' : 'hover:bg-neutral-50 bg-neutral-50/50'}`}
                                                >
                                                    <div
                                                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.categoryId === cat.id ? 'scale-105' : ''}`}
                                                        style={{ backgroundColor: cat.color ? `${cat.color}25` : '#f0f0f0' }}
                                                    >
                                                        <CategoryIcon 
                                                            name={cat.icon} 
                                                            className="w-6 h-6" 
                                                            style={{ color: cat.color || '#666' }} 
                                                        />
                                                    </div>
                                                    <span className={`text-[10px] font-semibold truncate w-full text-center leading-tight ${formData.categoryId === cat.id ? 'text-white' : 'text-neutral-700'}`}>
                                                        {cat.name}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* FOOTER */}
                    <div className="p-4 border-t border-neutral-100 bg-white/90 backdrop-blur-sm pb-8">
                        <button
                            onClick={handleSubmit}
                            disabled={!formData.amount || !formData.accountId || !formData.categoryId}
                            className="w-full bg-neutral-900 text-white hover:bg-neutral-800 disabled:bg-neutral-200 py-3.5 rounded-2xl font-bold text-base shadow-lg shadow-neutral-900/10 transition-all active:scale-[0.98]"
                        >
                            {editingId ? 'Actualizar Transacción Automática' : 'Crear Transacción Automática'}
                        </button>
                    </div>
                </div>
            )}

            {/* List of Recurring Transactions */}
            <div className="space-y-3">
                {recurringTransactions.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-neutral-200">
                        <RefreshCw className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                        <h3 className="font-bold text-neutral-900 mb-1">Sin transacciones automáticas</h3>
                        <p className="text-sm text-neutral-500">Automatiza tus aportaciones mensuales o pagos recurrentes</p>
                    </div>
                ) : (
                    recurringTransactions.map((rt) => (
                        <div
                            key={rt.id}
                            className="bg-white rounded-2xl p-4 border border-neutral-100 hover:border-neutral-200 transition-all"
                        >
                            <div className="flex items-start gap-4">
                                {/* Icon/Category */}
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: rt.categories?.color ? `${rt.categories.color}20` : '#f5f5f5' }}
                                >
                                    <CategoryIcon 
                                        name={rt.categories?.icon} 
                                        className="w-6 h-6" 
                                        style={{ color: rt.categories?.color || '#666' }} 
                                    />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-neutral-900 truncate text-base">
                                            {rt.description || rt.categories?.name || 'Sin descripción'}
                                        </h3>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${rt.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {rt.type === 'income' ? 'Ingreso' : 'Gasto'}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500 mb-2">
                                        <span className="font-medium">{rt.accounts?.name}</span>
                                        <span>•</span>
                                        <span className="capitalize font-medium">
                                            {rt.frequency === 'monthly' ? 'Mensual' : rt.frequency === 'weekly' ? 'Semanal' : 'Anual'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-neutral-600 bg-neutral-50 rounded-lg px-2.5 py-1.5 w-fit">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span className="font-semibold">Próxima ejecución:</span>
                                        <span className="font-bold">{new Date(rt.next_run_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                    </div>
                                </div>

                                {/* Amount & Actions */}
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                    <p className={`font-black text-xl ${rt.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {rt.type === 'income' ? '+' : ''}{Number(rt.amount).toFixed(2)}€
                                    </p>
                                    <div className="relative">
                                        <button
                                            onClick={() => setMenuOpen(menuOpen === rt.id ? null : rt.id)}
                                            className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
                                        >
                                            <MoreVertical className="w-4 h-4 text-neutral-400" />
                                        </button>
                                        {menuOpen === rt.id && (
                                            <div className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg py-1 z-10 min-w-[140px]">
                                                <button
                                                    onClick={() => handleEdit(rt)}
                                                    className="w-full px-4 py-2 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => handleProcessNow(rt.id)}
                                                    disabled={isProcessing === rt.id}
                                                    className="w-full px-4 py-2 text-left text-sm font-medium text-blue-600 hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50"
                                                >
                                                    <Play className={`w-4 h-4 ${isProcessing === rt.id ? 'animate-pulse' : ''}`} />
                                                    Ejecutar ahora
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(rt.id)}
                                                    className="w-full px-4 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Eliminar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
