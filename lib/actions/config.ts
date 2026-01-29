'use server';

import { createClient } from '@/lib/supabase/server';

export async function getBanks() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { data: null, error: 'No autenticado' };
    }

    const { data, error } = await supabase
        .from('banks')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

    return { data, error };
}

export async function getCategories() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { data: null, error: 'No autenticado' };
    }

    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

    return { data, error };
}
