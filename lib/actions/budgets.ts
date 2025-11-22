'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getBudgets() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { data: null, error: 'No autenticado' };
    }

    try {
        const { data, error } = await supabase
            .from('budgets')
            .select(`
        *,
        categories (
          id,
          name
        )
      `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { data, error: null };
    } catch (error: any) {
        console.error('Error fetching budgets:', error);
        return { data: null, error: error.message };
    }
}

export async function createBudget(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'No autenticado' };
    }

    const categoryId = formData.get('category_id') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const period = 'monthly'; // Default to monthly for now
    const startDate = new Date().toISOString().split('T')[0]; // Start from today/this month

    if (!categoryId || isNaN(amount)) {
        return { error: 'Datos inválidos' };
    }

    try {
        const { error } = await supabase
            .from('budgets')
            .insert({
                user_id: user.id,
                category_id: categoryId,
                amount,
                period,
                start_date: startDate,
            });

        if (error) throw error;

        revalidatePath('/dashboard/presupuestos');
        return { error: null };
    } catch (error: any) {
        console.error('Error creating budget:', error);
        return { error: error.message };
    }
}

export async function updateBudget(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'No autenticado' };
    }

    const id = formData.get('id') as string;
    const amount = parseFloat(formData.get('amount') as string);

    if (!id || isNaN(amount)) {
        return { error: 'Datos inválidos' };
    }

    try {
        const { error } = await supabase
            .from('budgets')
            .update({ amount })
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;

        revalidatePath('/dashboard/presupuestos');
        return { error: null };
    } catch (error: any) {
        console.error('Error updating budget:', error);
        return { error: error.message };
    }
}

export async function deleteBudget(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'No autenticado' };
    }

    try {
        const { error } = await supabase
            .from('budgets')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;

        revalidatePath('/dashboard/presupuestos');
        return { error: null };
    } catch (error: any) {
        console.error('Error deleting budget:', error);
        return { error: error.message };
    }
}

export async function getBudgetProgress() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { data: null, error: 'No autenticado' };
    }

    try {
        // 1. Get all budgets
        const { data: budgets, error: budgetsError } = await supabase
            .from('budgets')
            .select(`
        *,
        categories (
          id,
          name
        )
      `)
            .eq('user_id', user.id);

        if (budgetsError) throw budgetsError;

        if (!budgets || budgets.length === 0) {
            return { data: [], error: null };
        }

        // 2. Get current month transactions for these categories
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        const categoryIds = budgets.map(b => b.category_id);

        const { data: transactions, error: transactionsError } = await supabase
            .from('transactions')
            .select('category_id, amount, type')
            .eq('user_id', user.id)
            .in('category_id', categoryIds)
            .gte('transaction_date', firstDayOfMonth)
            .lte('transaction_date', lastDayOfMonth)
            .eq('type', 'expense'); // Only count expenses against budget

        if (transactionsError) throw transactionsError;

        // 3. Calculate progress
        const progressData = budgets.map(budget => {
            const spent = transactions
                ?.filter(t => t.category_id === budget.category_id)
                .reduce((sum, t) => sum + t.amount, 0) || 0;

            return {
                ...budget,
                spent,
                percentage: (spent / budget.amount) * 100,
                remaining: budget.amount - spent
            };
        });

        return { data: progressData, error: null };

    } catch (error: any) {
        console.error('Error calculating budget progress:', error);
        return { data: null, error: error.message };
    }
}
