import { createClient } from '@/lib/supabase/server';
import AccountsPageClient from '@/components/dashboard/AccountsPageClient';

export default async function AccountsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: banksList } = await supabase
        .from('banks')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

    return <AccountsPageClient banks={banksList || []} />;
}
