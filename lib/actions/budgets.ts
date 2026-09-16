'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { startOfMonth } from 'date-fns';

export async function upsertBudget(categoryId: string, amount: number, isSavings: boolean = false) {
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
            .update({ amount, is_savings: isSavings })
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
                is_savings: isSavings,
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

export async function upsertBudgetSettings(monthlyIncome: number, cushion: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'No autorizado' };
    }

    const { error } = await supabase
        .from('budget_settings')
        .upsert(
            { user_id: user.id, monthly_income: monthlyIncome, cushion, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
        );

    if (error) {
        console.error('Error upserting budget settings:', error);
        return { error: error.message };
    }

    revalidatePath('/dashboard/presupuestos');
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

// --- Smart Budgets: sobrante de mes anterior (Rollover / Auto-Ahorro) ---
// Persistido en Supabase (tabla budget_rollover_actions) en vez de localStorage, para que
// el estado sea el mismo en cualquier dispositivo del usuario, no solo en el navegador local.

export type RolloverAction = 'rollover' | 'auto_savings' | 'dismissed';

/** Claves `categoryId:monthKey` ya resueltas (para no repetir el aviso de sobrante). */
export async function getHandledRolloverKeys(): Promise<{ data: string[]; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: 'No autorizado' };

    const { data, error } = await supabase
        .from('budget_rollover_actions')
        .select('category_id, month_key')
        .eq('user_id', user.id);

    if (error) {
        console.error('Error fetching rollover actions:', error);
        return { data: [], error: error.message };
    }

    return { data: (data || []).map(r => `${r.category_id}:${r.month_key}`) };
}

/** Registra qué se hizo con el sobrante de una categoría en un mes concreto. */
export async function recordRolloverAction(categoryId: string, monthKey: string, action: RolloverAction, surplus: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autorizado' };

    const { error } = await supabase
        .from('budget_rollover_actions')
        .upsert(
            { user_id: user.id, category_id: categoryId, month_key: monthKey, action, surplus },
            { onConflict: 'user_id,category_id,month_key' }
        );

    if (error) {
        console.error('Error recording rollover action:', error);
        return { error: error.message };
    }

    revalidatePath('/dashboard/presupuestos');
    return { success: true };
}
