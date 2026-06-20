import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardContent from '@/components/dashboard/DashboardContent';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const firstName = user.user_metadata?.name?.split(' ')[0] || 'Usuario';

  return <DashboardContent firstName={firstName} />;
}
