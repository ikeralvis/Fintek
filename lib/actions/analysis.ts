'use server';

import { createClient } from '@/lib/supabase/server';
import { startOfMonth, subMonths, format, endOfMonth, parseISO, eachMonthOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

export async function getSpendingAnalysis() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'No autorizado' };

    // 1. Fetch Data for Analysis (Last 6 Months for robust trend)
    const now = new Date();
    const startDate = subMonths(startOfMonth(now), 5); // 6 months total including current
    const endDate = now;

    const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('amount, type, category_id, transaction_date')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('transaction_date', startDate.toISOString())
        .lte('transaction_date', endDate.toISOString());

    if (txError) {
        console.error("Analysis Transaction Error", txError);
        return { error: 'Error al cargar transacciones' };
    }

    const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id);

    if (!transactions || transactions.length === 0) {
        return {
            data: {
                categories: [],
                totalPrediction: 0,
                monthName: format(now, 'MMMM', { locale: es })
            }
        };
    }

    // 2. Process Data by Month & Category
    const categoriesMap = (categories || []).reduce((acc: any, c: any) => ({ ...acc, [c.id]: c }), {});
    const monthlyData: Record<string, Record<string, number>> = {}; // { '2023-10': { 'catId': 100 } }

    const months = eachMonthOfInterval({ start: startDate, end: now }).map(d => format(d, 'yyyy-MM'));
    months.forEach(m => monthlyData[m] = {});

    transactions.forEach((t: any) => {
        const m = format(parseISO(t.transaction_date), 'yyyy-MM');
        if (monthlyData[m]) {
            const catId = t.category_id || 'unknown';
            monthlyData[m][catId] = (monthlyData[m][catId] || 0) + t.amount;
        }
    });

    // 3. Algorithm: Weighted Moving Average + Linear Trend

    const analysisResults = (categories || []).map((cat: any) => {
        const id = cat.id;
        const history = months.slice(0, -1).map(m => monthlyData[m][id] || 0); // Exclude current month
        const currentMonthSpent = monthlyData[months[months.length - 1]][id] || 0;

        // Need at least 2 months of history for a basic trend
        if (history.length < 2) {
            return {
                categoryId: id,
                name: cat.name,
                icon: cat.icon,
                color: cat.color,
                history,
                current: currentMonthSpent,
                prediction: Math.max(currentMonthSpent, history[0] || 0), // Fallback
                trend: 0,
                warning: null
            };
        }

        // Weighted Average Calculation
        const last3 = history.slice(-3);
        let prediction = 0;

        if (last3.length === 3) {
            prediction = (last3[2] * 0.5) + (last3[1] * 0.3) + (last3[0] * 0.2);
        } else if (last3.length === 2) {
            prediction = (last3[1] * 0.6) + (last3[0] * 0.4);
        } else {
            prediction = last3[0];
        }

        // Simple Linear Trend
        const avgRecent = history.slice(-2).reduce((a, b) => a + b, 0) / 2;
        const avgOlder = history.slice(0, -2).reduce((a, b) => a + b, 0) / Math.max(1, history.length - 2);
        const trendPercent = avgOlder > 0 ? ((avgRecent - avgOlder) / avgOlder) * 100 : 0;

        // Apply trend adjustment
        if (trendPercent > 10) prediction *= 1.05;

        // Generate Insight
        let insight = null;
        if (trendPercent > 15) insight = `Gasto aumentando rápidamente (+${trendPercent.toFixed(0)}%)`;
        if (currentMonthSpent > prediction * 1.1) insight = `Ya has superado la previsión de este mes`;

        return {
            categoryId: id,
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
            history,
            average: history.reduce((a, b) => a + b, 0) / history.length,
            current: currentMonthSpent,
            prediction: Math.round(prediction),
            trend: trendPercent,
            insight
        };
    }).filter((r: any) => r.prediction > 0 || r.current > 0).sort((a: any, b: any) => b.prediction - a.prediction);

    const totalPrediction = analysisResults.reduce((acc: number, r: any) => acc + r.prediction, 0);

    // Return properly locale-formatted month name safely
    return {
        data: {
            categories: analysisResults,
            totalPrediction,
            monthName: format(now, 'MMMM', { locale: es })
        }
    };
}
