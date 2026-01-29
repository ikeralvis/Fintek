import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import StatisticsView from '@/components/dashboard/StatisticsView';

export default async function EstadisticasPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Fetch ALL transactions for historical analysis
    // Use account_id explicitly to avoid ambiguity with destination_account_id
    const [txRes, accRes, catRes] = await Promise.all([
        supabase
            .from('transactions')
            .select('*, categories(id, name, icon, color), accounts!account_id(id, name, banks(name, color))')
            .eq('user_id', user.id)
            .order('transaction_date', { ascending: true }),

        supabase
            .from('accounts')
            .select('*, banks(id, name, color)')
            .eq('user_id', user.id),

        supabase
            .from('categories')
            .select('*')
            .eq('user_id', user.id)
    ]);

    // Debug log
    console.log('[STATS DEBUG] Transactions count:', txRes.data?.length, 'Error:', txRes.error);

    return (
        <StatisticsView
            initialTransactions={txRes.data || []}
            accounts={accRes.data || []}
            categories={catRes.data || []}
        />
    );
}
