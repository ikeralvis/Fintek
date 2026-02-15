'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getRecurringTransactions() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { data: null, error: 'No autenticado' };

    try {
        const { data, error } = await supabase
            .from('recurring_transactions')
            .select(`
        *,
        accounts (name),
        categories (name)
      `)
            .eq('user_id', user.id)
            .order('next_run_date', { ascending: true });

        if (error) throw error;
        return { data, error: null };
    } catch (err: any) {
        console.error('Error fetching recurring transactions:', err);
        return { data: null, error: err.message };
    }
}

import { z } from 'zod';

const RecurringTransactionSchema = z.object({
    type: z.enum(['income', 'expense']),
    accountId: z.string().uuid(),
    categoryId: z.string().uuid(),
    amount: z.number().positive(),
    description: z.string().optional(),
    frequency: z.enum(['monthly', 'weekly', 'yearly']),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
});

export async function createRecurringTransaction(formData: {
    type: 'income' | 'expense';
    accountId: string;
    categoryId: string;
    amount: number;
    description?: string;
    frequency: 'monthly' | 'weekly' | 'yearly';
    startDate: string;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'No autenticado' };

    // Validate input with Zod
    const validation = RecurringTransactionSchema.safeParse(formData);
    if (!validation.success) {
        return { error: 'Datos inválidos: ' + validation.error.issues.map(e => e.message).join(', ') };
    }

    try {
        const { error } = await supabase
            .from('recurring_transactions')
            .insert([
                {
                    user_id: user.id,
                    type: formData.type,
                    account_id: formData.accountId,
                    category_id: formData.categoryId,
                    amount: formData.amount,
                    description: formData.description,
                    frequency: formData.frequency,
                    start_date: formData.startDate,
                    next_run_date: formData.startDate, // Initial run date
                    active: true
                }
            ]);

        if (error) throw error;

        revalidatePath('/dashboard/configuracion');
        return { error: null };
    } catch (err: any) {
        console.error('Error creating recurring transaction:', err);
        return { error: err.message };
    }
}

export async function deleteRecurringTransaction(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'No autenticado' };

    try {
        const { error } = await supabase
            .from('recurring_transactions')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;

        revalidatePath('/dashboard/configuracion');
        return { error: null };
    } catch (err: any) {
        console.error('Error deleting recurring transaction:', err);
        return { error: err.message };
    }
}

export async function processRecurringTransaction(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'No autenticado' };

    try {
        // 1. Get the recurring transaction
        const { data: recurring, error: fetchError } = await supabase
            .from('recurring_transactions')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;
        if (!recurring) return { error: 'Transacción no encontrada' };

        // 2. Create the actual transaction
        const { error: insertError } = await supabase
            .from('transactions')
            .insert([
                {
                    user_id: user.id,
                    type: recurring.type,
                    account_id: recurring.account_id,
                    category_id: recurring.category_id,
                    amount: recurring.amount,
                    description: recurring.description || `Recurrente: ${recurring.frequency}`,
                    transaction_date: new Date().toISOString().split('T')[0],
                }
            ]);

        if (insertError) throw insertError;

        // 3. Update next_run_date
        const nextDate = new Date(recurring.next_run_date);
        if (recurring.frequency === 'monthly') {
            nextDate.setMonth(nextDate.getMonth() + 1);
        } else if (recurring.frequency === 'weekly') {
            nextDate.setDate(nextDate.getDate() + 7);
        } else if (recurring.frequency === 'yearly') {
            nextDate.setFullYear(nextDate.getFullYear() + 1);
        }

        const { error: updateError } = await supabase
            .from('recurring_transactions')
            .update({ next_run_date: nextDate.toISOString().split('T')[0] })
            .eq('id', id);

        if (updateError) throw updateError;

        revalidatePath('/dashboard/transacciones');
        revalidatePath('/dashboard/configuracion');
        return { error: null };
    } catch (err: any) {
        console.error('Error processing recurring transaction:', err);
        return { error: err.message };
    }
}

export async function updateRecurringTransaction(
    id: string,
    formData: {
        type: 'income' | 'expense';
        accountId: string;
        categoryId: string;
        amount: number;
        description?: string;
        frequency: 'monthly' | 'weekly' | 'yearly';
        startDate: string;
    }
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'No autenticado' };

    // Validate input with Zod
    const validation = RecurringTransactionSchema.safeParse(formData);
    if (!validation.success) {
        return { error: 'Datos inválidos: ' + validation.error.issues.map(e => e.message).join(', ') };
    }

    try {
        const { error } = await supabase
            .from('recurring_transactions')
            .update({
                type: formData.type,
                account_id: formData.accountId,
                category_id: formData.categoryId,
                amount: formData.amount,
                description: formData.description,
                frequency: formData.frequency,
                next_run_date: formData.startDate,
            })
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;

        revalidatePath('/dashboard/suscripciones');
        revalidatePath('/dashboard/configuracion');
        return { error: null };
    } catch (err: any) {
        console.error('Error updating recurring transaction:', err);
        return { error: err.message };
    }
}
