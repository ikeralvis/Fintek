import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardNav from '@/components/layout/DashboardNav';
import BottomNav from '@/components/layout/BottomNav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-20 md:pb-0"> {/* Add padding bottom for mobile nav */}
      <DashboardNav
        userName={user.user_metadata?.name}
        userEmail={user.email}
      />
      <main className="animate-in fade-in duration-500">{children}</main>
      <BottomNav />
    </div>
  );
}