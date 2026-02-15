'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Check, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { createTransfer } from '@/lib/actions/transfers';
import CategoryIcon from '@/components/ui/CategoryIcon';

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

type Category = {
  id: string;
  name: string;
  icon?: string;
  color?: string;
};

type Props = {
  accounts: Account[];
  categories: Category[];
};

export default function TransactionForm({ accounts, categories }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(''); // Para transferencias
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Collapsible states
  const [isAccountsExpanded, setIsAccountsExpanded] = useState(false);
  const [isToAccountsExpanded, setIsToAccountsExpanded] = useState(false);
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(true);

  const selectedCategory = categories.find(c => c.id === categoryId);
  const selectedAccount = accounts.find(a => a.id === accountId);
  const selectedToAccount = accounts.find(a => a.id === toAccountId);

  // Agrupar cuentas por banco
  const groupedAccounts = accounts.reduce((acc: any, account) => {
    const bankName = account.banks?.name || 'Otros';
    if (!acc[bankName]) acc[bankName] = [];
    acc[bankName].push(account);
    return acc;
  }, {});

  const handleSubmit = async () => {
    if (!amount || !accountId) return;
    
    if (type === 'transfer' && !toAccountId) return;
    if ((type === 'expense' || type === 'income') && !categoryId) return;

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      if (type === 'transfer') {
        // Usar la acción de transferencia
        const result = await createTransfer({
          fromAccountId: accountId,
          toAccountId,
          amount: Number.parseFloat(amount),
          description: description || 'Transferencia',
          transactionDate: date
        });

        if (result.error) throw new Error(result.error);
      } else {
        // Transacción normal (el trigger de la BD actualiza automáticamente el saldo)
        const { error } = await supabase.from('transactions').insert([{
          user_id: user.id,
          account_id: accountId,
          category_id: categoryId,
          amount: Number.parseFloat(amount),
          description,
          type,
          transaction_date: date
        }]);

        if (error) throw error;
      }

      const previousPath = sessionStorage.getItem('previousPath') || '/dashboard/transacciones';
      sessionStorage.removeItem('previousPath');
      router.push(previousPath);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAccount = (id: string) => {
    setAccountId(id);
    setIsAccountsExpanded(false);
  };

  const handleSelectToAccount = (id: string) => {
    setToAccountId(id);
    setIsToAccountsExpanded(false);
  };

  const handleSelectCategory = (id: string) => {
    setCategoryId(id);
    setIsCategoriesExpanded(false);
  };

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col animate-slide-up">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-neutral-100">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full hover:bg-neutral-100 transition-colors"
        >
          <X className="w-5 h-5 text-neutral-900" />
        </button>
        <div className="flex bg-neutral-100 rounded-full p-0.5">
          <button
            onClick={() => setType('expense')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${type === 'expense' ? 'bg-white text-rose-500 shadow-sm' : 'text-neutral-500'}`}
          >
            Gasto
          </button>
          <button
            onClick={() => setType('income')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${type === 'income' ? 'bg-white text-emerald-500 shadow-sm' : 'text-neutral-500'}`}
          >
            Ingreso
          </button>
          <button
            onClick={() => setType('transfer')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${type === 'transfer' ? 'bg-white text-blue-500 shadow-sm' : 'text-neutral-500'}`}
          >
            Transferencia
          </button>
        </div>
        <div className="w-9" /> {/* Spacer for balance */}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-6 max-w-lg mx-auto space-y-5">

          {/* AMOUNT INPUT - More prominent */}
          <div className="text-center py-4">
            <div className="relative inline-flex items-center justify-center">
              <span className={`text-3xl font-bold mr-1 ${type === 'expense' ? 'text-rose-300' : type === 'income' ? 'text-emerald-300' : 'text-blue-300'}`}>€</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`bg-transparent text-5xl font-black placeholder-neutral-200 focus:outline-none w-full text-center max-w-[240px] ${type === 'expense' ? 'text-rose-500' : type === 'income' ? 'text-emerald-500' : 'text-blue-500'}`}
                autoFocus
              />
            </div>
          </div>

          {/* DESCRIPTION & DATE - Compact inline */}
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

          {/* ACCOUNT SELECTOR - Collapsible GROUPED BY BANK */}
          <div className="bg-white border border-neutral-100 rounded-2xl overflow-hidden shadow-sm">
            <button
              onClick={() => setIsAccountsExpanded(!isAccountsExpanded)}
              className="w-full p-3 flex items-center justify-between hover:bg-neutral-50 transition-colors"
            >
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                {type === 'transfer' ? 'Desde' : 'Cuenta'}
              </span>
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
                          onClick={() => handleSelectAccount(acc.id)}
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
                          {accountId === acc.id && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TO ACCOUNT SELECTOR - Solo para transferencias */}
          {type === 'transfer' && (
            <div className="bg-white border border-neutral-100 rounded-2xl overflow-hidden shadow-sm">
              <button
                onClick={() => setIsToAccountsExpanded(!isToAccountsExpanded)}
                className="w-full p-3 flex items-center justify-between hover:bg-neutral-50 transition-colors"
              >
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Para</span>
                <div className="flex items-center gap-2">
                  {selectedToAccount && (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-[8px] font-bold text-white overflow-hidden"
                        style={{ backgroundColor: selectedToAccount.banks?.logo_url ? 'transparent' : (selectedToAccount.banks?.color || '#000') }}
                      >
                        {selectedToAccount.banks?.logo_url ? (
                          <img src={selectedToAccount.banks.logo_url} alt="" className="w-full h-full object-contain" />
                        ) : (
                          selectedToAccount.banks?.name?.substring(0, 2).toUpperCase() || '💰'
                        )}
                      </div>
                      <span className="text-sm font-bold text-neutral-900">{selectedToAccount.name}</span>
                    </div>
                  )}
                  {isToAccountsExpanded ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                </div>
              </button>

              {isToAccountsExpanded && (
                <div className="border-t border-neutral-100 p-2 space-y-2 max-h-48 overflow-y-auto">
                  {Object.entries(groupedAccounts).map(([bankName, bankAccounts]: [string, any]) => (
                    <div key={bankName}>
                      <div className="px-2 py-1 text-xs font-bold text-neutral-400 uppercase tracking-wider">{bankName}</div>
                      <div className="space-y-1">
                        {bankAccounts
                          .filter((acc: Account) => acc.id !== accountId) // No mostrar la misma cuenta
                          .map((acc: Account) => (
                            <button
                              key={acc.id}
                              onClick={() => handleSelectToAccount(acc.id)}
                              className={`w-full p-2.5 rounded-xl flex items-center gap-3 transition-all ${toAccountId === acc.id
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
                                <p className={`text-sm font-bold truncate ${toAccountId === acc.id ? 'text-white' : 'text-neutral-900'}`}>{acc.name}</p>
                                <p className={`text-xs ${toAccountId === acc.id ? 'text-neutral-300' : 'text-neutral-500'}`}>
                                  {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(acc.current_balance)}
                                </p>
                              </div>
                              {toAccountId === acc.id && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                            </button>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CATEGORIES - Collapsible with compact grid - Solo para expense/income */}
          {type !== 'transfer' && (
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
                        onClick={() => handleSelectCategory(cat.id)}
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
          )}

        </div>
      </div>

      {/* FOOTER */}
      <div className="p-4 border-t border-neutral-100 bg-white/90 backdrop-blur-sm pb-8">
        <button
          onClick={handleSubmit}
          disabled={loading || !amount || !accountId || (type !== 'transfer' && !categoryId) || (type === 'transfer' && !toAccountId)}
          className="w-full bg-neutral-900 text-white hover:bg-neutral-800 disabled:bg-neutral-200 py-3.5 rounded-2xl font-bold text-base shadow-lg shadow-neutral-900/10 transition-all active:scale-[0.98]"
        >
          {loading ? 'Guardando...' : `Añadir ${type === 'expense' ? 'Gasto' : type === 'income' ? 'Ingreso' : 'Transferencia'}`}
        </button>
      </div>
    </div>
  );
}