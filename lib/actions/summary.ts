'use server';

import { createClient } from '@/lib/supabase/server';

export async function getSummaryData(year: number, categoryId?: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'No autenticado' };
  }

  try {
    // Obtener todas las transacciones del año
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    let query = supabase
      .from('transactions')
      .select(`
        *,
        categories (
          id,
          name
        )
      `)
      .eq('user_id', user.id)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data: transactions, error } = await query;

    if (error) throw error;

    // Organizar datos por mes y categoría
    const monthlyData: any = {};
    const categoryTotals: any = {};

    // Inicializar estructura para 12 meses
    for (let month = 0; month < 12; month++) {
      monthlyData[month] = {
        income: 0,
        expense: 0,
        categories: {},
      };
    }

    transactions?.forEach((transaction) => {
      const date = new Date(transaction.transaction_date);
      const month = date.getMonth();
      const categoryName = transaction.categories?.name || 'Sin categoría';

      // Totales por mes
      if (transaction.type === 'income') {
        monthlyData[month].income += transaction.amount;
      } else {
        monthlyData[month].expense += transaction.amount;
      }

      // Totales por categoría y mes
      if (!monthlyData[month].categories[categoryName]) {
        monthlyData[month].categories[categoryName] = {
          income: 0,
          expense: 0,
        };
      }

      if (transaction.type === 'income') {
        monthlyData[month].categories[categoryName].income += transaction.amount;
      } else {
        monthlyData[month].categories[categoryName].expense += transaction.amount;
      }

      // Totales anuales por categoría
      if (!categoryTotals[categoryName]) {
        categoryTotals[categoryName] = {
          income: 0,
          expense: 0,
          balance: 0,
        };
      }

      if (transaction.type === 'income') {
        categoryTotals[categoryName].income += transaction.amount;
      } else {
        categoryTotals[categoryName].expense += transaction.amount;
      }
    });

    // Calcular balances
    Object.keys(categoryTotals).forEach((category) => {
      categoryTotals[category].balance =
        categoryTotals[category].income - categoryTotals[category].expense;
    });

    return {
      data: {
        monthlyData,
        categoryTotals,
        transactions: transactions || [],
      },
      error: null,
    };
  } catch (err: any) {
    console.error('Error fetching summary data:', err);
    return { data: null, error: err.message };
  }
}

export async function getAvailableYears() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'No autenticado' };
  }

  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('transaction_date')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: true });

    if (error) throw error;

    if (!transactions || transactions.length === 0) {
      return { data: [new Date().getFullYear()], error: null };
    }

    const years = new Set<number>();
    transactions.forEach((t) => {
      const year = new Date(t.transaction_date).getFullYear();
      years.add(year);
    });

    return { data: Array.from(years).sort((a, b) => b - a), error: null };
  } catch (err: any) {
    console.error('Error fetching available years:', err);
    return { data: null, error: err.message };
  }
}