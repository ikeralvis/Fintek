import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SimpleSubscriptionForm from '@/components/dashboard/SimpleSubscriptionForm';

export default async function NuevaSuscripcionPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    return <SimpleSubscriptionForm />;
}
