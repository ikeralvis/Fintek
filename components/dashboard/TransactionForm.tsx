'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { X, Check, Calendar, ChevronDown, ChevronUp, Search, Landmark } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { createTransfer } from '@/lib/actions/transfers';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { NumericInput } from '@/components/ui/numeric-input';
import { CategoryPicker } from '@/components/ui/category-picker';
import { useDashboard } from '@/lib/DashboardContext';
import { SUGGESTIONS, findCategoryByName, matchCategoryFromText, type Suggestion } from '@/lib/transactionSuggestions';
import { getFrequentCategoryIds } from '@/lib/frequentCategories';
import { cn } from '@/lib/utils';

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
  const { transactions } = useDashboard();
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
  // Recuerda si la categoría actual la puso la auto-categorización (para no pisar una
  // elección manual del usuario mientras sigue escribiendo el concepto).
  const autoCategoryIdRef = useRef<string | null>(null);

  // Focus amount on mount
  useEffect(() => {
    setTimeout(() => amountRef.current?.focus(), 100);
  }, []);

  // La cuenta por defecto ya viene ordenada con la favorita primero (accounts[0]), pero si la
  // última transacción se hizo con otra cuenta, se recuerda para no tener que reabrir el selector.
  useEffect(() => {
    try {
      const lastUsed = window.localStorage.getItem('fintek:lastAccountId');
      if (lastUsed && accounts.some(a => a.id === lastUsed)) {
        setAccountId(lastUsed);
      }
    } catch { /* localStorage no disponible (privado, etc.) */ }
  }, [accounts]);

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

  const handleDescriptionChange = (value: string) => {
    setDescription(value);

    // Auto-categorización en tiempo real: si la categoría actual está vacía o la puso esta
    // misma auto-detección, cada pulsación intenta encontrar la categoría que mejor encaja
    // con lo que se lleva escrito, sin esperar a que el usuario elija una sugerencia.
    if (!categoryId || categoryId === autoCategoryIdRef.current) {
      const match = matchCategoryFromText(value, categories);
      if (match && match.id !== categoryId) {
        setCategoryId(match.id);
        autoCategoryIdRef.current = match.id;
      }
    }

    if (value.length >= 2) {
      const query = value.toLowerCase();
      const matches = SUGGESTIONS.filter(s => {
        const hasCategory = findCategoryByName(categories, s.category);
        if (!hasCategory) return false;
        return (
          s.label.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query) ||
          s.category.toLowerCase().includes(query)
        );
      }).slice(0, 6);
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
    const matchedCat = findCategoryByName(categories, suggestion.category);
    if (matchedCat) {
      setCategoryId(matchedCat.id);
      autoCategoryIdRef.current = matchedCat.id;
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
  const frequentCategoryIds = useMemo(
    () => (type === 'transfer' ? [] : getFrequentCategoryIds(transactions, type, 5)),
    [transactions, type]
  );
  const selectedAccount = accounts.find(a => a.id === accountId);
  const selectedToAccount = accounts.find(a => a.id === toAccountId);

  const groupedAccounts = accounts.reduce((acc: Record<string, Account[]>, account) => {
    const bankName = account.banks?.name || 'Otros';
    if (!acc[bankName]) acc[bankName] = [];
    acc[bankName].push(account);
    return acc;
  }, {});

  const parsedAmount = Number.parseFloat(amount) || 0;
  const canSubmit = parsedAmount > 0 && accountId && (type === 'transfer' ? toAccountId : categoryId);

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setLoading(true);

    // Si se eligió categoría pero se dejó el título vacío, el nombre de la categoría hace
    // de título por defecto en vez de guardar la transacción sin concepto.
    const finalDescription = description.trim() || selectedCategory?.name || '';

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      if (type === 'transfer') {
        const result = await createTransfer({
          fromAccountId: accountId,
          toAccountId,
          categoryId: categoryId || undefined,
          amount: Number.parseFloat(amount),
          description: finalDescription || 'Transferencia',
          transactionDate: date
        });

        if (result.error) throw new Error(result.error);
      } else {
        const { error } = await supabase.from('transactions').insert([{
          user_id: user.id,
          account_id: accountId,
          category_id: categoryId,
          amount: Number.parseFloat(amount),
          description: finalDescription,
          type,
          transaction_date: date
        }]);

        if (error) throw error;
      }

      try { window.localStorage.setItem('fintek:lastAccountId', accountId); } catch { /* ignore */ }

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
    // Elección manual y explícita: deja de auto-recategorizar mientras el usuario siga
    // escribiendo, para no pisar lo que acaba de elegir.
    autoCategoryIdRef.current = null;
    setIsCategoriesExpanded(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex h-[100dvh] flex-col bg-background animate-slide-up sm:static sm:h-auto sm:max-h-[90vh] sm:overflow-hidden sm:rounded-3xl sm:border sm:border-border sm:shadow-strong">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-border">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex bg-muted rounded-full p-0.5">
          <button
            onClick={() => setType('expense')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${type === 'expense' ? 'bg-card text-accent-600 dark:text-accent-400 shadow-sm' : 'text-muted-foreground'}`}
          >
            Gasto
          </button>
          <button
            onClick={() => setType('income')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${type === 'income' ? 'bg-card text-secondary-600 dark:text-secondary-400 shadow-sm' : 'text-muted-foreground'}`}
          >
            Ingreso
          </button>
          <button
            onClick={() => setType('transfer')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${type === 'transfer' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}
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
            <NumericInput
              ref={amountRef}
              value={amount}
              onValueChange={setAmount}
              placeholder="0,00"
              currencySymbol="€"
              currencyClassName={`text-2xl font-semibold ${type === 'expense' ? 'text-accent-500/60 dark:text-accent-400/60' : type === 'income' ? 'text-secondary-500/60 dark:text-secondary-400/60' : 'text-primary/50'}`}
              wrapperClassName="mx-auto w-full max-w-[240px] justify-center"
              className={`h-auto w-full border-none bg-transparent p-0 pr-8 text-center text-5xl font-semibold shadow-none placeholder:text-muted-foreground focus-visible:ring-0 ${type === 'expense' ? 'text-accent-600 dark:text-accent-400' : type === 'income' ? 'text-secondary-600 dark:text-secondary-400' : 'text-primary'}`}
            />
          </div>

          {/* DESCRIPTION WITH AUTOCOMPLETE + DATE */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  ref={descriptionRef}
                  type="text"
                  placeholder="Descripción (ej: Mercadona, Netflix...)"
                  value={description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  onKeyDown={handleDescriptionKeyDown}
                  onFocus={() => description.length >= 2 && filteredSuggestions.length > 0 && setShowSuggestions(true)}
                  className="w-full bg-muted/60 border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-foreground font-medium placeholder-muted-foreground focus:bg-card focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-all"
                />
              </div>

              {/* Suggestions dropdown */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden"
                >
                  {filteredSuggestions.map((suggestion, idx) => {
                    const matchedCat = findCategoryByName(categories, suggestion.category);
                    return (
                      <button
                        key={`${suggestion.label}-${idx}`}
                        onClick={() => handleSelectSuggestion(suggestion)}
                        onMouseEnter={() => setActiveSuggestionIdx(idx)}
                        className={`w-full px-3 py-2.5 flex items-center gap-3 text-left transition-colors ${
                          idx === activeSuggestionIdx ? 'bg-muted/60' : 'hover:bg-muted/60'
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
                          <p className="text-sm font-semibold text-foreground truncate">{suggestion.label}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {matchedCat ? matchedCat.name : suggestion.category}
                            {suggestion.amount ? ` · ${suggestion.amount.toFixed(2)}€` : ''}
                          </p>
                        </div>
                        {suggestion.type && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            suggestion.type === 'expense' ? 'bg-accent-500/10 text-accent-600 dark:text-accent-400' : 'bg-secondary-500/10 text-secondary-600 dark:text-secondary-400'
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
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-muted/60 border border-border rounded-xl pl-8 pr-2 py-2.5 text-sm text-foreground font-medium outline-none w-[130px]"
              />
            </div>
          </div>

          {/* ACCOUNT SELECTOR */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <button
              onClick={() => setIsAccountsExpanded(!isAccountsExpanded)}
              className="w-full p-3 flex items-center justify-between hover:bg-muted/60 transition-colors"
            >
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
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
                        selectedAccount.banks?.name?.substring(0, 2).toUpperCase() || <Landmark className="w-3 h-3" />
                      )}
                    </div>
                    <span className="text-sm font-bold text-foreground">{selectedAccount.name}</span>
                  </div>
                )}
                {isAccountsExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>

            {isAccountsExpanded && (
              <div className="border-t border-border p-2 space-y-2 max-h-48 overflow-y-auto">
                {Object.entries(groupedAccounts).map(([bankName, bankAccounts]) => (
                  <div key={bankName}>
                    <div className="px-2 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">{bankName}</div>
                    <div className="space-y-1">
                      {bankAccounts.map((acc) => (
                        <button
                          key={acc.id}
                          onClick={() => handleSelectAccount(acc.id)}
                          className={`w-full p-2.5 rounded-xl flex items-center gap-3 transition-all ${accountId === acc.id
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted/60'
                            }`}
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0 overflow-hidden"
                            style={{ backgroundColor: acc.banks?.logo_url ? 'transparent' : (acc.banks?.color || '#000') }}
                          >
                            {acc.banks?.logo_url ? (
                              <img src={acc.banks.logo_url} alt="" className="w-full h-full object-contain" />
                            ) : (
                              acc.banks?.name?.substring(0, 2).toUpperCase() || <Landmark className="w-3 h-3" />
                            )}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className={`text-sm font-bold truncate ${accountId === acc.id ? 'text-primary-foreground' : 'text-foreground'}`}>{acc.name}</p>
                            <p className={`text-xs ${accountId === acc.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                              {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(acc.current_balance)}
                            </p>
                          </div>
                          {accountId === acc.id && <Check className="w-4 h-4 text-secondary-500 dark:text-secondary-400 shrink-0" />}
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
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <button
                onClick={() => setIsToAccountsExpanded(!isToAccountsExpanded)}
                className="w-full p-3 flex items-center justify-between hover:bg-muted/60 transition-colors"
              >
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Para</span>
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
                          selectedToAccount.banks?.name?.substring(0, 2).toUpperCase() || <Landmark className="w-3 h-3" />
                        )}
                      </div>
                      <span className="text-sm font-bold text-foreground">{selectedToAccount.name}</span>
                    </div>
                  )}
                  {isToAccountsExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {isToAccountsExpanded && (
                <div className="border-t border-border p-2 space-y-2 max-h-48 overflow-y-auto">
                  {Object.entries(groupedAccounts).map(([bankName, bankAccounts]) => (
                    <div key={bankName}>
                      <div className="px-2 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">{bankName}</div>
                      <div className="space-y-1">
                        {bankAccounts
                          .filter((acc) => acc.id !== accountId)
                          .map((acc) => (
                            <button
                              key={acc.id}
                              onClick={() => handleSelectToAccount(acc.id)}
                              className={`w-full p-2.5 rounded-xl flex items-center gap-3 transition-all ${toAccountId === acc.id
                                  ? 'bg-primary text-primary-foreground'
                                  : 'hover:bg-muted/60'
                                }`}
                            >
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0 overflow-hidden"
                                style={{ backgroundColor: acc.banks?.logo_url ? 'transparent' : (acc.banks?.color || '#000') }}
                              >
                                {acc.banks?.logo_url ? (
                                  <img src={acc.banks.logo_url} alt="" className="w-full h-full object-contain" />
                                ) : (
                                  acc.banks?.name?.substring(0, 2).toUpperCase() || <Landmark className="w-3 h-3" />
                                )}
                              </div>
                              <div className="flex-1 text-left min-w-0">
                                <p className={`text-sm font-bold truncate ${toAccountId === acc.id ? 'text-primary-foreground' : 'text-foreground'}`}>{acc.name}</p>
                                <p className={`text-xs ${toAccountId === acc.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                  {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(acc.current_balance)}
                                </p>
                              </div>
                              {toAccountId === acc.id && <Check className="w-4 h-4 text-secondary-500 dark:text-secondary-400 shrink-0" />}
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
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <button
                onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/60 transition-colors"
              >
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Categoría</span>
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
                      <span className="text-sm font-bold text-foreground">{selectedCategory.name}</span>
                    </div>
                  )}
                  {isCategoriesExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {isCategoriesExpanded && (
                <div className="border-t border-border p-3">
                  <CategoryPicker
                    categories={categories}
                    selectedId={categoryId}
                    onSelect={handleSelectCategory}
                    frequentIds={frequentCategoryIds}
                  />
                </div>
              )}
          </div>

        </div>
      </div>

      {/* FOOTER */}
      <div className="p-4 border-t border-border bg-card/90 backdrop-blur-sm pb-[max(2rem,env(safe-area-inset-bottom))]">
        <button
          onClick={handleSubmit}
          disabled={loading || !canSubmit}
          className={cn(
            'w-full py-3.5 rounded-2xl font-bold text-base transition-all active:scale-[0.98]',
            loading || !canSubmit
              ? 'bg-muted text-muted-foreground shadow-none'
              : type === 'income'
                ? 'bg-emerald-600 text-white hover:bg-emerald-600/90 shadow-lg shadow-emerald-600/20'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/10'
          )}
        >
          {loading ? 'Guardando...' : `Añadir ${type === 'expense' ? 'Gasto' : type === 'income' ? 'Ingreso' : 'Transferencia'}`}
        </button>
      </div>
    </div>
  );
}
