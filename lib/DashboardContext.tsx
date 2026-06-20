'use client';

import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

type Bank = {
  id?: string;
  name: string;
  color: string;
  logo_url?: string;
};

type Account = {
  id: string;
  name: string;
  current_balance: number;
  initial_balance: number;
  bank_id?: string;
  type?: string;
  is_favorite?: boolean;
  is_active?: boolean;
  banks?: Bank;
};

type Category = {
  id: string;
  name: string;
  icon?: string;
  color?: string;
};

type Transaction = {
  id: string;
  account_id: string;
  category_id?: string;
  related_account_id?: string | null;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description?: string;
  transaction_date: string;
  categories?: Category | null;
  accounts?: { id?: string; name: string };
};

type DashboardContextType = {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  userId: string;
  setAccounts: (accounts: Account[]) => void;
  setCategories: (categories: Category[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (tx: Transaction) => void;
  removeTransaction: (id: string) => void;
  refreshData: () => Promise<void>;
};

const DashboardContext = createContext<DashboardContextType | null>(null);

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
}

type ProviderProps = {
  children: React.ReactNode;
  initialAccounts: Account[];
  initialCategories: Category[];
  initialTransactions: Transaction[];
  userId: string;
};

export function DashboardProvider({
  children,
  initialAccounts,
  initialCategories,
  initialTransactions,
  userId,
}: ProviderProps) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);

  const addTransaction = useCallback((tx: Transaction) => {
    setTransactions(prev => [tx, ...prev]);
  }, []);

  const removeTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  const refreshData = useCallback(async () => {
    const supabase = createClient();
    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;

    const [accRes, catRes, txRes] = await Promise.all([
      supabase
        .from('accounts')
        .select('*, banks(id, name, color, logo_url)')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('is_favorite', { ascending: false })
        .order('current_balance', { ascending: false }),
      supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .order('name'),
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('transaction_date', yearStart)
        .order('transaction_date', { ascending: false }),
    ]);

    const newAccounts = (accRes.data || []).map((acc: any) => ({
      ...acc,
      banks: Array.isArray(acc.banks) ? acc.banks[0] : acc.banks,
    }));
    const newCategories = catRes.data || [];
    const newTransactions = txRes.data || [];

    const catsMap = newCategories.reduce((m: Record<string, Category>, c: Category) => {
      m[c.id] = c;
      return m;
    }, {});
    const accsMap = newAccounts.reduce((m: Record<string, { id: string; name: string }>, a: Account) => {
      m[a.id] = { id: a.id, name: a.name };
      return m;
    }, {});

    const enriched = newTransactions.map((t: any) => ({
      ...t,
      categories: t.category_id ? catsMap[t.category_id] || null : null,
      accounts: accsMap[t.account_id] || { name: 'Cuenta' },
    }));

    setAccounts(newAccounts);
    setCategories(newCategories);
    setTransactions(enriched);
  }, [userId]);

  const value = useMemo(() => ({
    accounts,
    categories,
    transactions,
    userId,
    setAccounts,
    setCategories,
    setTransactions,
    addTransaction,
    removeTransaction,
    refreshData,
  }), [accounts, categories, transactions, userId, addTransaction, removeTransaction, refreshData]);

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}
