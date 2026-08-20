import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ConfiguracionPageClient from '@/components/dashboard/ConfiguracionPageClient';

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [banksRes, catsRes, notifRes] = await Promise.all([
    supabase.from('banks').select('*').eq('user_id', user.id).order('name'),
    supabase.from('categories').select('*').eq('user_id', user.id).order('name'),
    supabase.from('notification_settings').select('*').eq('user_id', user.id).maybeSingle(),
  ]);

  const banks = banksRes.data || [];
  const categories = catsRes.data || [];
  const notificationSettings = notifRes.data || {
    push_enabled: false,
    budget_alerts: true,
    budget_threshold_percent: 90,
    subscription_reminders: true,
    ai_estimate_alerts: true,
    investment_reminders: false,
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-32 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-neutral-50/80 backdrop-blur-xl border-b border-neutral-100 px-5 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-neutral-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-neutral-700" />
          </Link>
          <h1 className="text-lg font-semibold text-neutral-900">Configuración</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-6">
        <ConfiguracionPageClient
          user={user}
          userId={user.id}
          banks={banks}
          categories={categories}
          notificationSettings={notificationSettings}
        />
      </div>
    </div>
  );
}
