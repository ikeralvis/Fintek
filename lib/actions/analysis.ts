'use server';

import { createClient } from '@/lib/supabase/server';
import { subMonths, startOfMonth } from 'date-fns';
import { computeSpendingAnalysis } from '@/lib/utils/spendingPrediction';

export async function getSpendingAnalysis() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'No autorizado' };

    // Fetch Data (Last 12 months for better statistical significance)
    const now = new Date();
    const startDate = subMonths(startOfMonth(now), 11); // 12 months total

    const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('amount, type, category_id, transaction_date')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('transaction_date', startDate.toISOString())
        .lte('transaction_date', now.toISOString());

    if (txError) {
        console.error("Analysis Transaction Error", txError);
        return { error: 'Error al cargar transacciones' };
    }

    const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id);

    return { data: computeSpendingAnalysis(transactions || [], categories || [], now) };
}
