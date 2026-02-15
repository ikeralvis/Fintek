import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SubscriptionsViewNew from '@/components/dashboard/SubscriptionsViewNew';
import RecurringTransactionsList from '@/components/dashboard/RecurringTransactionsList';

export default async function SuscripcionesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    // Fetch subscriptions
    const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('next_payment_date', { ascending: true });

    // Fetch recurring transactions
    const { data: recurringTransactions } = await supabase
        .from('recurring_transactions')
        .select('*, accounts(name), categories(name)')
        .eq('user_id', user.id)
        .order('next_run_date', { ascending: true });

    // Fetch accounts and categories for forms
    const [accountsRes, categoriesRes] = await Promise.all([
        supabase
            .from('accounts')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('name'),
        supabase
            .from('categories')
            .select('*')
            .eq('user_id', user.id)
            .order('name')
    ]);

    // If table doesn't exist, show empty state (user needs to create it)
    if (error && error.code === '42P01') {
        return (
            <SubscriptionsViewNew 
                subscriptions={[]} 
                monthlyTotal={0} 
                recurringTransactions={recurringTransactions || []}
                accounts={accountsRes.data || []}
                categories={categoriesRes.data || []}
            />
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
            recurringTransactions={recurringTransactions || []}
            accounts={accountsRes.data || []}
            categories={categoriesRes.data || []}
        />
    );
}
