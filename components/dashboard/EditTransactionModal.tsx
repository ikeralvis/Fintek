'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import CategoryIcon from '@/components/ui/CategoryIcon';

type Category = {
    id: string;
    name: string;
    icon?: string;
    color?: string;
};

type Account = {
    id: string;
    name: string;
    banks?: {
        name: string;
        color: string;
        logo_url?: string;
    };
    current_balance: number;
};

type Transaction = {
    id: string;
    amount: number;
    type: string;
    description: string;
    transaction_date: string;
    category_id?: string;
    account_id: string;
    categories?: Category;
};

type Props = {
    transaction: Transaction;
    categories: Category[];
    accounts: Account[];
    onClose: () => void;
    onSaved: () => void;
};

export default function EditTransactionModal({ transaction, categories, accounts, onClose, onSaved }: Props) {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);

    const [amount, setAmount] = useState(transaction.amount.toString());
    const [description, setDescription] = useState(transaction.description || '');
    const [type, setType] = useState<'expense' | 'income'>(transaction.type as 'expense' | 'income');
    const [accountId, setAccountId] = useState(transaction.account_id);
    const [categoryId, setCategoryId] = useState(transaction.category_id || '');
    const [date, setDate] = useState(transaction.transaction_date.split('T')[0]);

    const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
    const [isAccountsExpanded, setIsAccountsExpanded] = useState(false);

    const selectedCategory = categories.find(c => c.id === categoryId);
    const selectedAccount = accounts.find(a => a.id === accountId);

    // Agrupar cuentas por banco
    const groupedAccounts = accounts.reduce((acc: any, account) => {
        const bankName = account.banks?.name || 'Otros';
        if (!acc[bankName]) acc[bankName] = [];
        acc[bankName].push(account);
        return acc;
    }, {});

    const handleSubmit = async () => {
        if (!amount || !accountId || !categoryId) return;
        setLoading(true);

        try {
            const newAmount = Number.parseFloat(amount);

            // Update transaction (el trigger de la BD actualiza automáticamente los saldos)
            const { error } = await supabase
                .from('transactions')
                .update({
                    amount: newAmount,
                    description,
                    type,
                    category_id: categoryId,
                    account_id: accountId,
                    transaction_date: date
                })
                .eq('id', transaction.id);

            if (error) throw error;

            onSaved();
            router.refresh();
        } catch (error) {
            console.error(error);
            alert('Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-end sm:items-center justify-center animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden animate-slide-up">
                {/* Header */}
                <div className="px-4 py-3 flex items-center justify-between border-b border-neutral-100">
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-neutral-100 transition-colors">
                        <X className="w-5 h-5 text-neutral-900" />
                    </button>
                    <h2 className="text-base font-bold text-neutral-900">Editar Transacción</h2>
                    <div className="w-9" />
                </div>

                <div className="overflow-y-auto max-h-[70vh] p-4 space-y-4">
                    {/* Type Toggle */}
                    <div className="flex justify-center">
                        <div className="flex bg-neutral-100 rounded-full p-0.5">
                            <button
                                onClick={() => setType('expense')}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${type === 'expense' ? 'bg-white text-rose-500 shadow-sm' : 'text-neutral-500'}`}
                            >
                                Gasto
                            </button>
                            <button
                                onClick={() => setType('income')}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${type === 'income' ? 'bg-white text-emerald-500 shadow-sm' : 'text-neutral-500'}`}
                            >
                                Ingreso
                            </button>
                        </div>
                    </div>

                    {/* Amount */}
                    <div className="text-center py-2">
                        <div className="relative inline-flex items-center justify-center">
                            <span className={`text-2xl font-bold mr-1 ${type === 'expense' ? 'text-rose-300' : 'text-emerald-300'}`}>€</span>
                            <input
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className={`bg-transparent text-4xl font-black placeholder-neutral-200 focus:outline-none w-full text-center max-w-[200px] ${type === 'expense' ? 'text-rose-500' : 'text-emerald-500'}`}
                            />
                        </div>
                    </div>

                    {/* Description & Date */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Descripción"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="flex-1 bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2.5 text-sm text-neutral-900 font-medium placeholder-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-200 outline-none"
                        />
                        <div className="relative">
                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="bg-neutral-50 border border-neutral-100 rounded-xl pl-8 pr-2 py-2.5 text-sm text-neutral-900 font-medium outline-none w-[130px]"
                            />
                        </div>
                    </div>

                    {/* Account Selector */}
                    <div className="bg-neutral-50 border border-neutral-100 rounded-xl overflow-hidden">
                        <button
                            onClick={() => setIsAccountsExpanded(!isAccountsExpanded)}
                            className="w-full p-2.5 flex items-center justify-between"
                        >
                            <span className="text-xs font-bold text-neutral-400 uppercase">Cuenta</span>
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
                                            {bankAccounts.map((acc: Account) => (
                                                <button
                                                    key={acc.id}
                                                    onClick={() => { setAccountId(acc.id); setIsAccountsExpanded(false); }}
                                                    className={`w-full p-2.5 rounded-xl flex items-center gap-3 transition-all ${accountId === acc.id
                                                            ? 'bg-neutral-900 text-white'
                                                            : 'hover:bg-neutral-50'
                                                        }`}
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
                                                        <p className={`text-sm font-bold truncate ${accountId === acc.id ? 'text-white' : 'text-neutral-900'}`}>{acc.name}</p>
                                                        <p className={`text-xs ${accountId === acc.id ? 'text-neutral-300' : 'text-neutral-500'}`}>
                                                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(acc.current_balance)}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Category Selector */}
                    <div className="bg-neutral-50 border border-neutral-100 rounded-xl overflow-hidden">
                        <button
                            onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
                            className="w-full p-2.5 flex items-center justify-between"
                        >
                            <span className="text-xs font-bold text-neutral-400 uppercase">Categoría</span>
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
                                            onClick={() => { setCategoryId(cat.id); setIsCategoriesExpanded(false); }}
                                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${categoryId === cat.id
                                                    ? 'bg-neutral-900'
                                                    : 'hover:bg-neutral-50 bg-neutral-50/50'
                                                }`}
                                        >
                                            <div
                                                className={`w-12 h-12 rounded-xl flex items-center justify-center ${categoryId === cat.id ? 'scale-105' : ''}`}
                                                style={{ backgroundColor: cat.color ? `${cat.color}25` : '#f0f0f0' }}
                                            >
                                                <CategoryIcon 
                                                    name={cat.icon} 
                                                    className="w-6 h-6" 
                                                    style={{ color: cat.color || '#666' }} 
                                                />
                                            </div>
                                            <span className={`text-[10px] font-semibold truncate w-full text-center leading-tight ${categoryId === cat.id ? 'text-white' : 'text-neutral-700'}`}>
                                                {cat.name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-neutral-100 bg-white pb-6">
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl font-bold text-sm border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !amount || !accountId || !categoryId}
                            className="flex-1 bg-neutral-900 text-white hover:bg-neutral-800 disabled:bg-neutral-200 py-3 rounded-xl font-bold text-sm transition-all"
                        >
                            {loading ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
