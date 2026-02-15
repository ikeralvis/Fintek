import { createClient } from '@/lib/supabase/server';
import TransactionsView from '@/components/dashboard/TransactionsView';

export default async function TransactionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // FETCH EVERYTHING IN PARALLEL
  const [txRes, accRes, catRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })
      .limit(1000),

    supabase
      .from('accounts')
      .select('id, name, current_balance, banks(name, color, logo_url)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('is_favorite', { ascending: false }),
    supabase.from('categories').select('*').eq('user_id', user.id)
  ]);

  const rawTransactions = txRes.data || [];
  // Map accounts para que banks sea un objeto (no array)
  const accounts = (accRes.data || []).map((acc: any) => ({
    ...acc,
    banks: Array.isArray(acc.banks) ? acc.banks[0] : acc.banks
  }));
  const categories = catRes.data || [];

  const accountsMap = accounts.reduce((acc: any, a: any) => ({ ...acc, [a.id]: { id: a.id, name: a.name } }), {});
  const categoriesMap = categories.reduce((acc: any, c: any) => ({ ...acc, [c.id]: c }), {});

  // ROBUST DATA ENRICHMENT
  const enrichedTransactions = rawTransactions.map((t: any) => {
    // Check if category_id exists and is in the map
    const cat = t.category_id ? categoriesMap[t.category_id] : null;

    return {
      ...t,
      // Pass the category object directly. TransactionsView handles t.categories?.name
      categories: cat || { name: 'General', icon: '💰', color: '#737373' },
      accounts: accountsMap[t.account_id] || { name: 'Cuenta' }
    };
  });

  return (
    <TransactionsView
      initialTransactions={enrichedTransactions}
      accounts={accounts}
      categories={categories}
    />
  );
}