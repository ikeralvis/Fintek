import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SubscriptionsView from '@/components/dashboard/SubscriptionsView';
import { AlertTriangle } from 'lucide-react';

export default async function SuscripcionesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('next_payment_date', { ascending: true }); // Showing upcoming first

    // Handling missing table error gracefully
    if (error && error.code === '42P01') { // 42P01 is undefined_table
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 max-w-2xl mx-auto text-center shadow-sm">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-amber-900 mb-2">Módulo de Suscripciones</h2>
                    <p className="text-amber-800 mb-6">
                        Para activar este módulo, necesitas actualizar tu base de datos con la nueva tabla **subscriptions**.
                    </p>
                    <div className="bg-white p-4 rounded-xl border border-amber-100 text-left text-sm font-mono text-neutral-600 overflow-x-auto">
                        <p className="whitespace-pre">
                            {`create table public.subscriptions (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  amount numeric not null,
  currency text not null default 'EUR',
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly', 'weekly', 'bi-weekly')),
  next_payment_date date not null,
  category_id uuid references public.categories (id) on delete set null,
  logo_url text null,
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  primary key (id)
);
alter table public.subscriptions enable row level security;
create policy "Users can view their own subscriptions" on public.subscriptions for select using (auth.uid() = user_id);
create policy "Users can insert their own subscriptions" on public.subscriptions for insert with check (auth.uid() = user_id);
create policy "Users can update their own subscriptions" on public.subscriptions for update using (auth.uid() = user_id);
create policy "Users can delete their own subscriptions" on public.subscriptions for delete using (auth.uid() = user_id);`}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // For calculating stats
    // We could do this in the view, but passing pre-calc data is nice
    const activeSubs = (subscriptions || []).filter((s: any) => s.status === 'active');

    // Simple Monthly total Estimate 
    // (Weekly * 4, Yearly / 12, etc)
    const monthlyTotal = activeSubs.reduce((acc: number, s: any) => {
        let amount = Number(s.amount);
        if (s.billing_cycle === 'weekly') amount *= 4;
        if (s.billing_cycle === 'bi-weekly') amount *= 2;
        if (s.billing_cycle === 'yearly') amount /= 12;
        return acc + amount;
    }, 0);

    return (
        <SubscriptionsView
            subscriptions={subscriptions || []}
            monthlyTotal={monthlyTotal}
        />
    );
}
