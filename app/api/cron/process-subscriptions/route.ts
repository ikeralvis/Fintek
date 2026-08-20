import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { addMonths, addWeeks, addYears, addDays, parseISO, format } from 'date-fns';
import { sendPushToUser } from '@/lib/push/sendToUser';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = createAdminClient();
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    // Aviso "mañana se cobra X" — no crea transacción, solo notifica
    const reminderResults = await sendTomorrowReminders(supabase, tomorrow);

    const { data: dueSubs, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('status', 'active')
        .lte('next_payment_date', today);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!dueSubs || dueSubs.length === 0) {
        return NextResponse.json({ message: 'No subscriptions due today.', reminders: reminderResults });
    }

    const results = { processed: 0, errors: 0, details: [] as any[] };

    for (const sub of dueSubs) {
        try {
            const accountId = sub.account_id || (await getDefaultAccountId(supabase, sub.user_id));
            if (!accountId) throw new Error('No account available for subscription');

            const { error: txError } = await supabase.from('transactions').insert({
                user_id: sub.user_id,
                account_id: accountId,
                amount: sub.amount,
                type: 'expense',
                description: `${sub.name} - Pago Recurrente`,
                category_id: sub.category_id,
                transaction_date: today,
            });
            if (txError) throw txError;

            const currentNext = parseISO(sub.next_payment_date);
            let newNextDate = currentNext;
            if (sub.billing_cycle === 'monthly') newNextDate = addMonths(currentNext, 1);
            else if (sub.billing_cycle === 'yearly') newNextDate = addYears(currentNext, 1);
            else if (sub.billing_cycle === 'weekly') newNextDate = addWeeks(currentNext, 1);
            else if (sub.billing_cycle === 'bi-weekly') newNextDate = addWeeks(currentNext, 2);

            const { error: updateError } = await supabase
                .from('subscriptions')
                .update({ next_payment_date: format(newNextDate, 'yyyy-MM-dd') })
                .eq('id', sub.id);
            if (updateError) throw updateError;

            results.processed++;
            results.details.push({ id: sub.id, name: sub.name, status: 'processed' });
        } catch (err: any) {
            console.error(`Error processing sub ${sub.id}:`, err);
            results.errors++;
            results.details.push({ id: sub.id, name: sub.name, error: err.message });
        }
    }

    return NextResponse.json({ ...results, reminders: reminderResults });
}

async function sendTomorrowReminders(supabase: any, tomorrow: string) {
    const { data: subsTomorrow } = await supabase
        .from('subscriptions')
        .select('id, user_id, name, amount')
        .eq('status', 'active')
        .eq('next_payment_date', tomorrow);

    if (!subsTomorrow || subsTomorrow.length === 0) return { sent: 0 };

    const userIds = Array.from(new Set(subsTomorrow.map((s: any) => s.user_id)));
    const { data: settings } = await supabase
        .from('notification_settings')
        .select('user_id, push_enabled, subscription_reminders')
        .in('user_id', userIds);

    const enabledUserIds = new Set(
        (settings || [])
            .filter((s: any) => s.push_enabled && s.subscription_reminders)
            .map((s: any) => s.user_id)
    );

    let sent = 0;
    for (const sub of subsTomorrow) {
        if (!enabledUserIds.has(sub.user_id)) continue;
        await sendPushToUser(supabase, sub.user_id, {
            title: 'Cobro mañana',
            body: `Mañana se cobra ${sub.name} (${Number(sub.amount).toFixed(2)}€)`,
            url: '/dashboard/suscripciones',
            tag: `subscription-reminder-${sub.id}`,
        });
        sent++;
    }
    return { sent };
}

async function getDefaultAccountId(supabase: any, userId: string) {
    const { data } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'checking')
        .limit(1)
        .single();
    return data?.id || null;
}
