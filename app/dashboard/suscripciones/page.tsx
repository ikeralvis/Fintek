import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SubscriptionsViewNew from '@/components/dashboard/SubscriptionsViewNew';

export default async function SuscripcionesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('next_payment_date', { ascending: true });

    // If table doesn't exist, show empty state (user needs to create it)
    if (error && error.code === '42P01') {
        return (
            <SubscriptionsViewNew subscriptions={[]} monthlyTotal={0} />
        );
    }

    // Calculate monthly total
    const activeSubs = (subscriptions || []).filter((s: any) => s.status === 'active');
    const monthlyTotal = activeSubs.reduce((acc: number, s: any) => {
        let amount = Number(s.amount);
        if (s.billing_cycle === 'weekly') amount *= 4;
        if (s.billing_cycle === 'bi-weekly') amount *= 2;
        if (s.billing_cycle === 'yearly') amount /= 12;
        return acc + amount;
    }, 0);

    return (
        <SubscriptionsViewNew
            subscriptions={subscriptions || []}
            monthlyTotal={monthlyTotal}
        />
    );
}
