import { createClient } from '@/lib/supabase/server';
import TransactionForm from '@/components/dashboard/TransactionForm';
import { redirect } from 'next/navigation';

export default async function NewTransactionPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const [accRes, catRes] = await Promise.all([
        supabase
            .from('accounts')
            .select('id, name, current_balance, banks(name, color, logo_url)')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('is_favorite', { ascending: false }),

        supabase
            .from('categories')
            .select('*')
            .eq('user_id', user.id)
            .order('name')
    ]);

    // Map accounts para que banks sea un objeto (no array)
    const accounts = (accRes.data || []).map((acc: any) => ({
        ...acc,
        banks: Array.isArray(acc.banks) ? acc.banks[0] : acc.banks
    }));
    const categories = catRes.data || [];

    return (
        <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-0 sm:p-4">
            <div className="w-full max-w-lg h-full sm:h-auto">
                <TransactionForm accounts={accounts} categories={categories} />
            </div>
        </div>
    );
}
