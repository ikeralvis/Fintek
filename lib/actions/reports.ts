"use server";

import { createClient } from '@/lib/supabase/server';

type Filters = {
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export async function getCategoryMonthlySummary(filters?: Filters) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: null, error: 'No autenticado' };

  try {
    let query = supabase
      .from('transactions')
      .select(`amount, type, transaction_date, categories ( id, name )`)
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: true });

    if (filters?.accountId) query = query.eq('account_id', filters.accountId);
    if (filters?.dateFrom) query = query.gte('transaction_date', filters.dateFrom);
    if (filters?.dateTo) query = query.lte('transaction_date', filters.dateTo);

    const { data: transactions, error } = await query;
    if (error) throw error;

    // Aggregate by month (YYYY-MM) and by category
    const monthsSet = new Set<string>();
    const monthlyTotalsMap: Record<string, { income: number; expense: number }> = {};
    const categoryMap: Record<string, { id: string; name: string; months: Record<string, { income: number; expense: number }> }> = {};

    (transactions || []).forEach((t: any) => {
      const month = (t.transaction_date || '').slice(0, 7); // YYYY-MM
      monthsSet.add(month);

      if (!monthlyTotalsMap[month]) monthlyTotalsMap[month] = { income: 0, expense: 0 };
      if (t.type === 'income') monthlyTotalsMap[month].income += t.amount;
      else monthlyTotalsMap[month].expense += t.amount;

      const cat = t.categories || { id: 'uncategorized', name: 'Sin categoría' };
      const catId = cat.id || 'uncategorized';
      if (!categoryMap[catId]) categoryMap[catId] = { id: catId, name: cat.name || 'Sin categoría', months: {} };
      if (!categoryMap[catId].months[month]) categoryMap[catId].months[month] = { income: 0, expense: 0 };
      if (t.type === 'income') categoryMap[catId].months[month].income += t.amount;
      else categoryMap[catId].months[month].expense += t.amount;
    });

    const months = Array.from(monthsSet).sort();

    const monthlyTotals = months.map((m) => ({ month: m, income: monthlyTotalsMap[m]?.income || 0, expense: monthlyTotalsMap[m]?.expense || 0, net: (monthlyTotalsMap[m]?.income || 0) - (monthlyTotalsMap[m]?.expense || 0) }));

    const categories = Object.values(categoryMap).map((c) => ({ id: c.id, name: c.name, monthly: months.map((m) => ({ month: m, income: c.months[m]?.income || 0, expense: c.months[m]?.expense || 0, net: (c.months[m]?.income || 0) - (c.months[m]?.expense || 0) })) }));

    return { data: { months, monthlyTotals, categories }, error: null };
  } catch (err: any) {
    console.error('Error generating report:', err);
    return { data: null, error: err.message };
  }
}
