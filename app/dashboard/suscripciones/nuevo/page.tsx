import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AddSubscriptionWizard from '@/components/dashboard/AddSubscriptionWizard';

export default async function NuevaSuscripcionPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    // Fetch accounts and categories for the wizard
    const [accountsRes, categoriesRes] = await Promise.all([
        supabase
            .from('accounts')
            .select('*, banks(name, color, logo_url)')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('is_favorite', { ascending: false }),
        supabase
            .from('categories')
            .select('*')
            .eq('user_id', user.id)
            .order('name')
    ]);

    const accounts = accountsRes.data || [];
    const categories = categoriesRes.data || [];

    return <AddSubscriptionWizard accounts={accounts} categories={categories} />;
}
