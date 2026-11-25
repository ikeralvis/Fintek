'use server';

import { toActionError } from '@/lib/actionError';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { startOfMonth } from 'date-fns';
import { z } from 'zod';

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
        return { error: toActionError(error, 'budgets') };
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
        return { error: toActionError(error, 'budgets') };
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
        return { error: toActionError(error, 'budgets') };
    }

    revalidatePath('/dashboard/presupuestos');
    return { success: true };
}

// --- Smart Budgets: sobrante de mes anterior (Rollover / Auto-Ahorro) ---
// Persistido en Supabase (tabla budget_rollover_actions) en vez de localStorage, para que
// el estado sea el mismo en cualquier dispositivo del usuario, no solo en el navegador local.

export type RolloverAction = 'rollover' | 'auto_savings' | 'dismissed';

/** Claves `categoryId:monthKey` ya resueltas (para no repetir el aviso de sobrante). */
export async function getHandledRolloverKeys(): Promise<{
    data: string[];
    /** Sobrantes movidos a ahorro: se suman al progreso del presupuesto de Ahorro del mes siguiente. */
    savings: { monthKey: string; surplus: number }[];
    error?: string;
}> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], savings: [], error: 'No autorizado' };

    const { data, error } = await supabase
        .from('budget_rollover_actions')
        .select('category_id, month_key, action, surplus')
        .eq('user_id', user.id);

    if (error) {
        console.error('Error fetching rollover actions:', error);
        return { data: [], savings: [], error: toActionError(error, 'budgets') };
    }

    const rows = data || [];
    return {
        data: rows.map(r => `${r.category_id}:${r.month_key}`),
        savings: rows
            .filter(r => r.action === 'auto_savings')
            .map(r => ({ monthKey: r.month_key as string, surplus: Number(r.surplus) })),
    };
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
        return { error: toActionError(error, 'budgets') };
    }

    revalidatePath('/dashboard/presupuestos');
    return { success: true };
}

// --- Plan del mes (editor "Configura tu mes") ---

const PlanSchema = z.object({
    monthlyIncome: z.number().min(0).max(10_000_000),
    cushion: z.number().min(0).max(10_000_000),
    savingsTarget: z.number().min(0).max(10_000_000),
    /** Presupuestos de gasto por categoría. amount 0 = quitar el presupuesto de esa categoría. */
    budgets: z.array(z.object({ categoryId: z.string().uuid(), amount: z.number().min(0).max(10_000_000) })).max(500),
});

/**
 * Guarda de una vez el plan completo: ingreso, margen, ahorro previsto y los presupuestos de
 * gasto. Los presupuestos de ahorro (is_savings) no se tocan.
 */
export async function saveBudgetPlan(input: z.input<typeof PlanSchema>) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autorizado' };

    const parsed = PlanSchema.safeParse(input);
    if (!parsed.success) return { error: 'Datos del plan no válidos' };
    const { monthlyIncome, cushion, savingsTarget, budgets } = parsed.data;

    const { error: settingsError } = await supabase
        .from('budget_settings')
        .upsert(
            { user_id: user.id, monthly_income: monthlyIncome, cushion, savings_target: savingsTarget, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
        );
    if (settingsError) return { error: toActionError(settingsError, 'budgets') };

    // Solo categorías del propio usuario (RLS ya lo impide, pero así el error es claro).
    const ids = budgets.map(b => b.categoryId);
    const { data: ownCats } = ids.length
        ? await supabase.from('categories').select('id').eq('user_id', user.id).in('id', ids)
        : { data: [] as { id: string }[] };
    const own = new Set((ownCats || []).map(c => c.id));

    const { data: existing, error: loadError } = await supabase
        .from('budgets').select('id, category_id, is_savings').eq('user_id', user.id);
    if (loadError) return { error: toActionError(loadError, 'budgets') };
    const byCat = new Map((existing || []).filter(b => !b.is_savings).map(b => [b.category_id, b.id]));
    const savingsCats = new Set((existing || []).filter(b => b.is_savings).map(b => b.category_id));

    const toDelete: string[] = [];
    const toInsert: Record<string, unknown>[] = [];
    const startDate = startOfMonth(new Date()).toISOString();
    for (const b of budgets) {
        if (!own.has(b.categoryId) || savingsCats.has(b.categoryId)) continue;
        const existingId = byCat.get(b.categoryId);
        if (b.amount <= 0) {
            if (existingId) toDelete.push(existingId);
        } else if (existingId) {
            const { error } = await supabase.from('budgets').update({ amount: b.amount }).eq('id', existingId).eq('user_id', user.id);
            if (error) return { error: toActionError(error, 'budgets') };
        } else {
            toInsert.push({ user_id: user.id, category_id: b.categoryId, amount: b.amount, is_savings: false, period: 'monthly', start_date: startDate });
        }
    }
    if (toInsert.length) {
        const { error } = await supabase.from('budgets').insert(toInsert);
        if (error) return { error: toActionError(error, 'budgets') };
    }
    if (toDelete.length) {
        const { error } = await supabase.from('budgets').delete().in('id', toDelete).eq('user_id', user.id);
        if (error) return { error: toActionError(error, 'budgets') };
    }

    revalidatePath('/dashboard/presupuestos');
    revalidatePath('/dashboard');
    return { success: true };
}
