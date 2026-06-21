import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SubscriptionsPage from '@/components/dashboard/SubscriptionsPage';

export default async function SuscripcionesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [subsRes, accountsRes, categoriesRes] = await Promise.all([
        supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .order('next_payment_date', { ascending: true }),
        supabase
            .from('accounts')
            .select('id, name, banks(name, color)')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('name'),
        supabase
            .from('categories')
            .select('id, name, icon, color')
            .eq('user_id', user.id)
            .order('name'),
    ]);

    const accounts = (accountsRes.data || []).map((a: any) => ({
        ...a,
        banks: Array.isArray(a.banks) ? a.banks[0] : a.banks,
    }));

    return (
        <SubscriptionsPage
            initialSubscriptions={subsRes.data || []}
            accounts={accounts}
            categories={categoriesRes.data || []}
            userId={user.id}
        />
    );
}
