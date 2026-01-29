import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BudgetsView from '@/components/dashboard/BudgetsView';

export default async function BudgetsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Parallel Fetch
    const [budgetsRes, transactionsRes, categoriesRes] = await Promise.all([
        supabase.from('budgets').select('*').eq('user_id', user.id),

        supabase
            .from('transactions')
            .select('amount, category_id, type')
            .eq('user_id', user.id)
            .eq('type', 'expense')
            .gte('transaction_date', startOfMonth),

        supabase.from('categories').select('*').eq('user_id', user.id)
    ]);

    return (
        <BudgetsView
            initialBudgets={budgetsRes.data || []}
            currentExpenses={transactionsRes.data || []}
            categories={categoriesRes.data || []}
        />
    );
}
