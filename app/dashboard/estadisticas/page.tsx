import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import StatisticsView from '@/components/dashboard/StatisticsView';

export default async function EstadisticasPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Fetch ALL transactions for historical analysis
    // Excluding transfers (they don't count as income/expense)
    const [txRes, accRes, catRes] = await Promise.all([
        supabase
            .from('transactions')
            .select('*, categories(id, name, icon, color), accounts(id, name, banks(name, color))')
            .eq('user_id', user.id)
            .not('type', 'eq', 'transfer') // Exclude transfers from stats
            .order('transaction_date', { ascending: true }), // Order by date ascending for charts

        supabase
            .from('accounts')
            .select('*, banks(id, name, color)')
            .eq('user_id', user.id),

        supabase
            .from('categories')
            .select('*')
            .eq('user_id', user.id)
    ]);

    return (
        <StatisticsView
            initialTransactions={txRes.data || []}
            accounts={accRes.data || []}
            categories={catRes.data || []}
        />
    );
}
