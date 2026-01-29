'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Popular subscription services with logos
const KNOWN_SERVICES: Record<string, { logo: string; color: string }> = {
    'netflix': { logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg', color: '#E50914' },
    'spotify': { logo: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg', color: '#1DB954' },
    'amazon prime': { logo: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Amazon_Prime_logo.svg', color: '#00A8E1' },
    'amazon': { logo: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Amazon_Prime_logo.svg', color: '#FF9900' },
    'youtube': { logo: 'https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg', color: '#FF0000' },
    'youtube premium': { logo: 'https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg', color: '#FF0000' },
    'apple': { logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg', color: '#000000' },
    'apple one': { logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg', color: '#000000' },
    'apple music': { logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg', color: '#FC3C44' },
    'icloud': { logo: 'https://upload.wikimedia.org/wikipedia/commons/d/d4/ICloud_logo.svg', color: '#3693F3' },
    'disney': { logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg', color: '#113CCF' },
    'disney+': { logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg', color: '#113CCF' },
    'hbo': { logo: 'https://upload.wikimedia.org/wikipedia/commons/1/17/HBO_Max_Logo.svg', color: '#5822B4' },
    'hbo max': { logo: 'https://upload.wikimedia.org/wikipedia/commons/1/17/HBO_Max_Logo.svg', color: '#5822B4' },
    'max': { logo: 'https://upload.wikimedia.org/wikipedia/commons/1/17/HBO_Max_Logo.svg', color: '#002BE7' },
    'chatgpt': { logo: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg', color: '#10A37F' },
    'openai': { logo: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg', color: '#10A37F' },
    'microsoft': { logo: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg', color: '#00A4EF' },
    'office': { logo: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg', color: '#D83B01' },
    'xbox': { logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f9/Xbox_one_logo.svg', color: '#107C10' },
    'playstation': { logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Playstation_logo_colour.svg', color: '#003087' },
    'twitch': { logo: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Twitch_Glitch_Logo_Purple.svg', color: '#9146FF' },
    'adobe': { logo: 'https://upload.wikimedia.org/wikipedia/commons/8/8d/Adobe_Corporate_Logo.png', color: '#FF0000' },
    'dropbox': { logo: 'https://upload.wikimedia.org/wikipedia/commons/7/78/Dropbox_Icon.svg', color: '#0061FF' },
    'google': { logo: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg', color: '#4285F4' },
    'google one': { logo: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg', color: '#4285F4' },
    'notion': { logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e9/Notion-logo.svg', color: '#000000' },
    'figma': { logo: 'https://upload.wikimedia.org/wikipedia/commons/3/33/Figma-logo.svg', color: '#F24E1E' },
    'slack': { logo: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg', color: '#4A154B' },
    'zoom': { logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Zoom_Communications_Logo.svg', color: '#2D8CFF' },
    'github': { logo: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg', color: '#181717' },
    'linkedin': { logo: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png', color: '#0A66C2' },
    'canva': { logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Canva_icon_2021.svg', color: '#00C4CC' },
    'crunchyroll': { logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Crunchyroll_Logo.png', color: '#F47521' },
    'nintendo': { logo: 'https://upload.wikimedia.org/wikipedia/commons/0/0d/Nintendo.svg', color: '#E60012' },
    'dazn': { logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/DAZN_logo.svg', color: '#F8F8F5' },
    'movistar': { logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6e/Movistar_isotype_2020.svg', color: '#019DF4' },
    'vodafone': { logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a8/Vodafone_2017_logo.svg', color: '#E60000' },
    'orange': { logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Orange_logo.svg', color: '#FF7900' },
    'telefonica': { logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6e/Movistar_isotype_2020.svg', color: '#019DF4' },
    'gym': { logo: '', color: '#10B981' },
    'gimnasio': { logo: '', color: '#10B981' },
};

function findServiceInfo(name: string): { logo_url: string | null; color: string } {
    const lowerName = name.toLowerCase();
    
    for (const [key, value] of Object.entries(KNOWN_SERVICES)) {
        if (lowerName.includes(key)) {
            return { logo_url: value.logo || null, color: value.color };
        }
    }
    
    return { logo_url: null, color: '#6366F1' }; // Default indigo
}

export async function createSubscription(formData: {
    name: string;
    amount: number;
    billingCycle: 'monthly' | 'yearly' | 'weekly';
    nextPaymentDate: string;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'No autenticado' };

    // Basic validation
    if (!formData.name?.trim()) {
        return { error: 'El nombre es obligatorio' };
    }
    if (!formData.amount || formData.amount <= 0) {
        return { error: 'El importe debe ser mayor a 0' };
    }
    if (!formData.nextPaymentDate) {
        return { error: 'La fecha de cobro es obligatoria' };
    }

    // Auto-detect service logo
    const serviceInfo = findServiceInfo(formData.name);

    try {
        const { error } = await supabase
            .from('subscriptions')
            .insert([{
                user_id: user.id,
                name: formData.name.trim(),
                amount: formData.amount,
                currency: 'EUR',
                billing_cycle: formData.billingCycle,
                next_payment_date: formData.nextPaymentDate,
                logo_url: serviceInfo.logo_url,
                status: 'active'
            }]);

        if (error) throw error;

        revalidatePath('/dashboard/suscripciones');
        return { error: null };
    } catch (err: any) {
        console.error('Error creating subscription:', err);
        return { error: err.message };
    }
}

export async function deleteSubscription(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'No autenticado' };

    try {
        const { error } = await supabase
            .from('subscriptions')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;

        revalidatePath('/dashboard/suscripciones');
        return { error: null };
    } catch (err: any) {
        console.error('Error deleting subscription:', err);
        return { error: err.message };
    }
}

export async function updateSubscription(id: string, formData: {
    name?: string;
    amount?: number;
    billingCycle?: 'monthly' | 'yearly' | 'weekly';
    nextPaymentDate?: string;
    status?: 'active' | 'paused' | 'cancelled';
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'No autenticado' };

    const updates: any = { updated_at: new Date().toISOString() };
    
    if (formData.name) {
        updates.name = formData.name.trim();
        const serviceInfo = findServiceInfo(formData.name);
        updates.logo_url = serviceInfo.logo_url;
    }
    if (formData.amount) updates.amount = formData.amount;
    if (formData.billingCycle) updates.billing_cycle = formData.billingCycle;
    if (formData.nextPaymentDate) updates.next_payment_date = formData.nextPaymentDate;
    if (formData.status) updates.status = formData.status;

    try {
        const { error } = await supabase
            .from('subscriptions')
            .update(updates)
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;

        revalidatePath('/dashboard/suscripciones');
        return { error: null };
    } catch (err: any) {
        console.error('Error updating subscription:', err);
        return { error: err.message };
    }
}

// Process subscriptions - create transactions for due subscriptions
export async function processSubscriptions() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'No autenticado', processed: 0 };

    const today = new Date().toISOString().split('T')[0];

    try {
        // Get all active subscriptions due today or earlier
        const { data: dueSubs, error: fetchError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .lte('next_payment_date', today);

        if (fetchError) throw fetchError;
        if (!dueSubs || dueSubs.length === 0) {
            return { error: null, processed: 0 };
        }

        // Get user's default account (first one)
        const { data: accounts } = await supabase
            .from('accounts')
            .select('id')
            .eq('user_id', user.id)
            .limit(1);

        if (!accounts || accounts.length === 0) {
            return { error: 'No hay cuentas configuradas', processed: 0 };
        }

        const defaultAccountId = accounts[0].id;

        // Process each due subscription
        for (const sub of dueSubs) {
            // Create transaction
            await supabase.from('transactions').insert([{
                user_id: user.id,
                account_id: defaultAccountId,
                type: 'expense',
                amount: sub.amount,
                description: `${sub.name} (Suscripción)`,
                transaction_date: sub.next_payment_date,
                is_subscription: true,
                subscription_id: sub.id
            }]);

            // Calculate next payment date
            const currentDate = new Date(sub.next_payment_date);
            let nextDate: Date;

            switch (sub.billing_cycle) {
                case 'weekly':
                    nextDate = new Date(currentDate.setDate(currentDate.getDate() + 7));
                    break;
                case 'yearly':
                    nextDate = new Date(currentDate.setFullYear(currentDate.getFullYear() + 1));
                    break;
                default: // monthly
                    nextDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
            }

            // Update subscription with next payment date
            await supabase
                .from('subscriptions')
                .update({ next_payment_date: nextDate.toISOString().split('T')[0] })
                .eq('id', sub.id);
        }

        revalidatePath('/dashboard');
        revalidatePath('/dashboard/suscripciones');
        revalidatePath('/dashboard/transacciones');

        return { error: null, processed: dueSubs.length };
    } catch (err: any) {
        console.error('Error processing subscriptions:', err);
        return { error: err.message, processed: 0 };
    }
}
