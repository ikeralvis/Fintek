'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X, Check, Calendar, ChevronDown, ChevronUp, Search } from 'lucide-react';
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

type Suggestion = {
  label: string;
  description: string;
  category: string;
  amount?: number;
  type?: 'expense' | 'income';
};

const SUGGESTIONS: Suggestion[] = [
  // Alimentación / Supermercado
  { label: 'Mercadona', description: 'Mercadona', category: 'Alimentación', type: 'expense' },
  { label: 'Lidl', description: 'Lidl', category: 'Alimentación', type: 'expense' },
  { label: 'Carrefour', description: 'Carrefour', category: 'Alimentación', type: 'expense' },
  { label: 'Eroski', description: 'Eroski', category: 'Alimentación', type: 'expense' },
  { label: 'Aldi', description: 'Aldi', category: 'Alimentación', type: 'expense' },
  { label: 'Dia', description: 'Dia', category: 'Alimentación', type: 'expense' },
  { label: 'BM', description: 'BM Supermercados', category: 'Supermercado', type: 'expense' },
  { label: 'Compra semanal', description: 'Compra semanal', category: 'Alimentación', type: 'expense' },

  // Restauración / Bar
  { label: 'Starbucks', description: 'Starbucks', category: 'Starbucks', type: 'expense' },
  { label: 'Café', description: 'Café', category: 'Bar', type: 'expense' },
  { label: 'Restaurante', description: 'Restaurante', category: 'Restaurantes', type: 'expense' },
  { label: 'Cena', description: 'Cena fuera', category: 'Restaurantes', type: 'expense' },
  { label: 'Comida', description: 'Comida fuera', category: 'Restauración', type: 'expense' },
  { label: 'Bar', description: 'Bar', category: 'Bar', type: 'expense' },
  { label: 'Pintxos', description: 'Pintxos', category: 'Bar', type: 'expense' },
  { label: 'McDonald\'s', description: 'McDonald\'s', category: 'Restauración', type: 'expense' },
  { label: 'Burger King', description: 'Burger King', category: 'Restauración', type: 'expense' },

  // Transporte
  { label: 'Gasolina', description: 'Gasolina', category: 'Transporte', type: 'expense' },
  { label: 'Bus', description: 'Autobús', category: 'Transporte', type: 'expense' },
  { label: 'Metro', description: 'Metro', category: 'Transporte', type: 'expense' },
  { label: 'Taxi', description: 'Taxi', category: 'Transporte', type: 'expense' },
  { label: 'Uber', description: 'Uber', category: 'Transporte', type: 'expense' },
  { label: 'Cabify', description: 'Cabify', category: 'Transporte', type: 'expense' },
  { label: 'Parking', description: 'Parking', category: 'Transporte', type: 'expense' },
  { label: 'Tren', description: 'Tren', category: 'Transporte', type: 'expense' },

  // Suscripciones
  { label: 'Netflix', description: 'Netflix', category: 'Suscripciones', amount: 17.99, type: 'expense' },
  { label: 'Spotify', description: 'Spotify', category: 'Suscripciones', amount: 10.99, type: 'expense' },
  { label: 'HBO', description: 'HBO Max', category: 'Suscripciones', amount: 8.99, type: 'expense' },
  { label: 'Amazon Prime', description: 'Amazon Prime', category: 'Suscripciones', amount: 4.99, type: 'expense' },
  { label: 'Disney+', description: 'Disney+', category: 'Suscripciones', amount: 8.99, type: 'expense' },
  { label: 'YouTube Premium', description: 'YouTube Premium', category: 'Suscripciones', amount: 11.99, type: 'expense' },
  { label: 'iCloud', description: 'iCloud', category: 'Suscripciones', amount: 0.99, type: 'expense' },
  { label: 'ChatGPT', description: 'ChatGPT Plus', category: 'Suscripciones', amount: 20.00, type: 'expense' },
  { label: 'Gimnasio', description: 'Gimnasio', category: 'Deportes', type: 'expense' },

  // Servicios
  { label: 'Luz', description: 'Factura luz', category: 'Servicios', type: 'expense' },
  { label: 'Agua', description: 'Factura agua', category: 'Servicios', type: 'expense' },
  { label: 'Gas', description: 'Factura gas', category: 'Servicios', type: 'expense' },
  { label: 'Internet', description: 'Internet/Fibra', category: 'Servicios', type: 'expense' },
  { label: 'Teléfono', description: 'Factura teléfono', category: 'Servicios', type: 'expense' },
  { label: 'Seguro', description: 'Seguro', category: 'Servicios', type: 'expense' },

  // Ocio
  { label: 'Cine', description: 'Cine', category: 'Ocio', type: 'expense' },

  // Salud
  { label: 'Farmacia', description: 'Farmacia', category: 'Salud', type: 'expense' },
  { label: 'Médico', description: 'Médico', category: 'Salud', type: 'expense' },
  { label: 'Dentista', description: 'Dentista', category: 'Salud', type: 'expense' },

  // Tecnología
  { label: 'Amazon', description: 'Amazon', category: 'Tecnología', type: 'expense' },
  { label: 'Apple', description: 'Apple', category: 'Tecnología', type: 'expense' },

  // Compras / Ropa
  { label: 'Zara', description: 'Zara', category: 'Ropa', type: 'expense' },
  { label: 'Primark', description: 'Primark', category: 'Ropa', type: 'expense' },
  { label: 'H&M', description: 'H&M', category: 'Ropa', type: 'expense' },
  { label: 'Compras', description: 'Compras', category: 'Compras', type: 'expense' },

  // Viajes / Hoteles
  { label: 'Hotel', description: 'Hotel', category: 'Hoteles', type: 'expense' },
  { label: 'Vuelo', description: 'Vuelo', category: 'Viajes', type: 'expense' },
  { label: 'Airbnb', description: 'Airbnb', category: 'Hoteles', type: 'expense' },

  // Peluquería
  { label: 'Peluquería', description: 'Peluquería', category: 'Pelu', type: 'expense' },
  { label: 'Pelu', description: 'Peluquería', category: 'Pelu', type: 'expense' },

  // Ingresos
  { label: 'Nómina', description: 'Nómina', category: 'Nomina', type: 'income' },
  { label: 'Bizum', description: 'Bizum recibido', category: 'Bizum', type: 'income' },
  { label: 'Transferencia', description: 'Transferencia recibida', category: 'Transferencia', type: 'income' },
  { label: 'Beca', description: 'Beca', category: 'Beca', type: 'income' },
  { label: 'Ingreso efectivo', description: 'Ingreso en efectivo', category: 'Ingreso efectivo', type: 'income' },
  { label: 'Intereses', description: 'Intereses cuenta', category: 'Intereses', type: 'income' },
  { label: 'Redondeo', description: 'Redondeo', category: 'Redondeo', type: 'income' },

  // Ahorro
  { label: 'Ahorro', description: 'Aportación ahorro', category: 'Ahorro', type: 'expense' },
  { label: 'Aportación', description: 'Aportación mensual', category: 'Aportacion mensual', type: 'expense' },
];

export default function TransactionForm({ accounts, categories }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [isAccountsExpanded, setIsAccountsExpanded] = useState(false);
  const [isToAccountsExpanded, setIsToAccountsExpanded] = useState(false);
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(true);

  // Autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);
  const [filteredSuggestions, setFilteredSuggestions] = useState<Suggestion[]>([]);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Focus amount on mount
  useEffect(() => {
    setTimeout(() => amountRef.current?.focus(), 100);
  }, []);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
          descriptionRef.current && !descriptionRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const findCategoryByName = useCallback((name: string): Category | undefined => {
    const lower = name.toLowerCase();
    return categories.find(c => c.name.toLowerCase() === lower);
  }, [categories]);

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    if (value.length >= 2) {
      const query = value.toLowerCase();
      const matches = SUGGESTIONS.filter(s =>
        s.label.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.category.toLowerCase().includes(query)
      ).slice(0, 6);
      setFilteredSuggestions(matches);
      setShowSuggestions(matches.length > 0);
      setActiveSuggestionIdx(-1);
    } else {
      setShowSuggestions(false);
      setFilteredSuggestions([]);
    }
  };

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    setDescription(suggestion.description);
    setShowSuggestions(false);

    // Auto-fill category
    const matchedCat = findCategoryByName(suggestion.category);
    if (matchedCat) {
      setCategoryId(matchedCat.id);
      setIsCategoriesExpanded(false);
    }

    // Auto-fill type if specified
    if (suggestion.type && type !== 'transfer') {
      setType(suggestion.type);
    }

    // Auto-fill amount if specified and empty
    if (suggestion.amount && !amount) {
      setAmount(suggestion.amount.toFixed(2));
    }

    // Focus amount if empty, otherwise focus stays
    if (!amount) {
      setTimeout(() => amountRef.current?.focus(), 50);
    }
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIdx(prev => Math.min(prev + 1, filteredSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIdx(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && activeSuggestionIdx >= 0) {
      e.preventDefault();
      handleSelectSuggestion(filteredSuggestions[activeSuggestionIdx]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const selectedCategory = categories.find(c => c.id === categoryId);
  const selectedAccount = accounts.find(a => a.id === accountId);
  const selectedToAccount = accounts.find(a => a.id === toAccountId);

  const groupedAccounts = accounts.reduce((acc: Record<string, Account[]>, account) => {
    const bankName = account.banks?.name || 'Otros';
    if (!acc[bankName]) acc[bankName] = [];
    acc[bankName].push(account);
    return acc;
  }, {});

  const canSubmit = amount && accountId && (type === 'transfer' ? toAccountId : categoryId);

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      if (type === 'transfer') {
        const result = await createTransfer({
          fromAccountId: accountId,
          toAccountId,
          categoryId: categoryId || undefined,
          amount: Number.parseFloat(amount),
          description: description || 'Transferencia',
          transactionDate: date
        });

        if (result.error) throw new Error(result.error);
      } else {
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

  // Global Enter to save
  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && canSubmit && !loading && !showSuggestions) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag !== 'TEXTAREA') {
        e.preventDefault();
        handleSubmit();
      }
    }
  }, [canSubmit, loading, showSuggestions, handleSubmit]);

  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

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
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-6 max-w-lg mx-auto space-y-5">

          {/* AMOUNT INPUT */}
          <div className="text-center py-4">
            <div className="relative inline-flex items-center justify-center">
              <span className={`text-3xl font-bold mr-1 ${type === 'expense' ? 'text-rose-300' : type === 'income' ? 'text-emerald-300' : 'text-blue-300'}`}>€</span>
              <input
                ref={amountRef}
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`bg-transparent text-5xl font-black placeholder-neutral-200 focus:outline-none w-full text-center max-w-[240px] ${type === 'expense' ? 'text-rose-500' : type === 'income' ? 'text-emerald-500' : 'text-blue-500'}`}
              />
            </div>
          </div>

          {/* DESCRIPTION WITH AUTOCOMPLETE + DATE */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300" />
                <input
                  ref={descriptionRef}
                  type="text"
                  placeholder="Descripción (ej: Mercadona, Netflix...)"
                  value={description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  onKeyDown={handleDescriptionKeyDown}
                  onFocus={() => description.length >= 2 && filteredSuggestions.length > 0 && setShowSuggestions(true)}
                  className="w-full bg-neutral-50 border border-neutral-100 rounded-xl pl-9 pr-3 py-2.5 text-sm text-neutral-900 font-medium placeholder-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-200 focus:border-neutral-200 outline-none transition-all"
                />
              </div>

              {/* Suggestions dropdown */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-neutral-200 rounded-xl shadow-lg z-50 overflow-hidden"
                >
                  {filteredSuggestions.map((suggestion, idx) => {
                    const matchedCat = findCategoryByName(suggestion.category);
                    return (
                      <button
                        key={`${suggestion.label}-${idx}`}
                        onClick={() => handleSelectSuggestion(suggestion)}
                        onMouseEnter={() => setActiveSuggestionIdx(idx)}
                        className={`w-full px-3 py-2.5 flex items-center gap-3 text-left transition-colors ${
                          idx === activeSuggestionIdx ? 'bg-neutral-50' : 'hover:bg-neutral-50'
                        }`}
                      >
                        {matchedCat && (
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: matchedCat.color ? `${matchedCat.color}20` : '#f5f5f5' }}
                          >
                            <CategoryIcon
                              name={matchedCat.icon}
                              className="w-4 h-4"
                              style={{ color: matchedCat.color || '#666' }}
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-neutral-900 truncate">{suggestion.label}</p>
                          <p className="text-[11px] text-neutral-400 truncate">
                            {matchedCat ? matchedCat.name : suggestion.category}
                            {suggestion.amount ? ` · ${suggestion.amount.toFixed(2)}€` : ''}
                          </p>
                        </div>
                        {suggestion.type && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            suggestion.type === 'expense' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'
                          }`}>
                            {suggestion.type === 'expense' ? 'Gasto' : 'Ingreso'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="relative shrink-0">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-neutral-50 border border-neutral-100 rounded-xl pl-8 pr-2 py-2.5 text-sm text-neutral-900 font-medium outline-none w-[130px]"
              />
            </div>
          </div>

          {/* ACCOUNT SELECTOR */}
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
                {Object.entries(groupedAccounts).map(([bankName, bankAccounts]) => (
                  <div key={bankName}>
                    <div className="px-2 py-1 text-xs font-bold text-neutral-400 uppercase tracking-wider">{bankName}</div>
                    <div className="space-y-1">
                      {bankAccounts.map((acc) => (
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

          {/* TO ACCOUNT - Solo para transferencias */}
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
                  {Object.entries(groupedAccounts).map(([bankName, bankAccounts]) => (
                    <div key={bankName}>
                      <div className="px-2 py-1 text-xs font-bold text-neutral-400 uppercase tracking-wider">{bankName}</div>
                      <div className="space-y-1">
                        {bankAccounts
                          .filter((acc) => acc.id !== accountId)
                          .map((acc) => (
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

        </div>
      </div>

      {/* FOOTER */}
      <div className="p-4 border-t border-neutral-100 bg-white/90 backdrop-blur-sm pb-8">
        <button
          onClick={handleSubmit}
          disabled={loading || !canSubmit}
          className="w-full bg-neutral-900 text-white hover:bg-neutral-800 disabled:bg-neutral-200 py-3.5 rounded-2xl font-bold text-base shadow-lg shadow-neutral-900/10 transition-all active:scale-[0.98]"
        >
          {loading ? 'Guardando...' : `Añadir ${type === 'expense' ? 'Gasto' : type === 'income' ? 'Ingreso' : 'Transferencia'}`}
        </button>
      </div>
    </div>
  );
}
