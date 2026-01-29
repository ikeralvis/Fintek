'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { startOfMonth } from 'date-fns';

export async function upsertBudget(categoryId: string, amount: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'No autorizado' };
    }

    // Check if budget exists for this category
    const { data: existing } = await supabase
        .from('budgets')
        .select('id')
        .eq('user_id', user.id)
        .eq('category_id', categoryId)
        .single();

    let error;
    const startDate = startOfMonth(new Date()).toISOString(); // Default to first of current month

    if (existing) {
        // Update
        const result = await supabase
            .from('budgets')
            .update({ amount }) // We don't update period/dates usually on simple amount edit, but could if needed
            .eq('id', existing.id);
        error = result.error;
    } else {
        // Insert
        const result = await supabase
            .from('budgets')
            .insert({
                user_id: user.id,
                category_id: categoryId,
                amount,
                period: 'monthly', // Default period
                start_date: startDate // FIX: Added required field
            });
        error = result.error;
    }

    if (error) {
        console.error('Error upserting budget:', error);
        return { error: error.message };
    }

    revalidatePath('/dashboard/presupuestos');
    revalidatePath('/dashboard/analisis');
    return { success: true };
}

export async function deleteBudget(budgetId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budgetId);

    if (error) {
        console.error('Error deleting budget:', error);
        return { error: error.message };
    }

    revalidatePath('/dashboard/presupuestos');
    return { success: true };
}
