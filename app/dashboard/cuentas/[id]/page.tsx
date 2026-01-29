import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import AccountDetailView from '@/components/dashboard/AccountDetailView';

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Fetch Account, Transactions, and Categories in parallel
    const [accountRes, transactionsRes, categoriesRes] = await Promise.all([
        supabase
            .from('accounts')
            .select('*, banks(id, name, color, logo_url)')
            .eq('id', id)
            .eq('user_id', user.id)
            .single(),

        supabase
            .from('transactions')
            .select('*, categories(id, name, icon, color)')
            .eq('account_id', id)
            .eq('user_id', user.id)
            .order('transaction_date', { ascending: false })
            .limit(500),

        supabase
            .from('categories')
            .select('*')
            .eq('user_id', user.id)
    ]);

    if (accountRes.error || !accountRes.data) {
        console.error('Account not found or error:', accountRes.error);
        notFound();
    }

    return (
        <AccountDetailView
            account={accountRes.data}
            initialTransactions={transactionsRes.data || []}
            categories={categoriesRes.data || []}
        />
    );
}

