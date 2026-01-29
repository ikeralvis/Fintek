import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AddSubscriptionWizard from '@/components/dashboard/AddSubscriptionWizard';

export default async function NuevaSuscripcionPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const [accountsRes, categoriesRes] = await Promise.all([
        supabase.from('accounts').select('id, name, current_balance, banks(name)').eq('user_id', user.id),
        supabase.from('categories').select('id, name').eq('user_id', user.id)
    ]);

    return (
        <AddSubscriptionWizard
            accounts={accountsRes.data || []}
            categories={categoriesRes.data || []}
        />
    );
}
