'use client';

import { useEffect, useState } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarClock } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useDashboard } from '@/lib/DashboardContext';

type Subscription = {
  id: string;
  name: string;
  amount: number;
  next_payment_date: string;
  status: string;
};

export default function UpcomingSubscriptionsWidget() {
  const { userId } = useDashboard();
  const [subscriptions, setSubscriptions] = useState<Subscription[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from('subscriptions')
      .select('id, name, amount, next_payment_date, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('next_payment_date', { ascending: true })
      .limit(4)
      .then(({ data }) => {
        if (!cancelled) setSubscriptions(data || []);
      });
    return () => { cancelled = true; };
  }, [userId]);

  if (!subscriptions || subscriptions.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">Próximos cobros</h3>
        <Link href="/dashboard/suscripciones" className="text-xs font-semibold text-neutral-400 hover:text-neutral-600">Ver todo</Link>
      </div>
      <div className="space-y-2.5">
        {subscriptions.map(sub => {
          const daysUntil = differenceInDays(parseISO(sub.next_payment_date), new Date());
          const isToday = daysUntil === 0;
          const isSoon = daysUntil >= 0 && daysUntil <= 3;
          return (
            <div key={sub.id} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isToday ? 'bg-amber-100 text-amber-600' : 'bg-neutral-100 text-neutral-400'}`}>
                <CalendarClock className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">{sub.name}</p>
                <p className={`text-xs ${isSoon ? 'text-amber-600 font-semibold' : 'text-neutral-400'}`}>
                  {isToday ? 'Hoy' : `${format(parseISO(sub.next_payment_date), 'd MMM', { locale: es })}${daysUntil > 0 && daysUntil <= 7 ? ` · en ${daysUntil}d` : ''}`}
                </p>
              </div>
              <span className="text-sm font-bold text-neutral-900 font-mono shrink-0">{Number(sub.amount).toFixed(2)}€</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
