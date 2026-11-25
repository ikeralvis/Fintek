import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { addMonths, addWeeks, addYears, addDays, parseISO, format } from 'date-fns';
import { sendPushToUser } from '@/lib/push/sendToUser';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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

            const type: 'expense' | 'income' | 'transfer' = sub.type || 'expense';
            if (type === 'transfer' && (!sub.to_account_id || sub.to_account_id === accountId)) {
                throw new Error('Transfer without a valid destination account');
            }
            await assertOwnership(
                supabase,
                sub.user_id,
                type === 'transfer' ? [accountId, sub.to_account_id] : [accountId],
                sub.category_id || null
            );

            // Si el cron no corrió algún día, se recuperan los cobros atrasados (cada uno con su
            // fecha), con un tope para no generar una avalancha por un dato mal puesto.
            let nextDate = parseISO(sub.next_payment_date);
            let created = 0;
            while (format(nextDate, 'yyyy-MM-dd') <= today && created < MAX_CATCHUP) {
                const dueDate = format(nextDate, 'yyyy-MM-dd');
                await createOccurrence(supabase, sub, accountId, type, dueDate);
                created++;
                nextDate = advance(nextDate, sub.billing_cycle);
            }

            const { error: updateError } = await supabase
                .from('subscriptions')
                .update({ next_payment_date: format(nextDate, 'yyyy-MM-dd') })
                .eq('id', sub.id);
            if (updateError) throw updateError;

            results.processed++;
            results.details.push({ id: sub.id, name: sub.name, status: 'processed', occurrences: created });
        } catch (err: any) {
            console.error(`Error processing sub ${sub.id}:`, err);
            results.errors++;
            results.details.push({ id: sub.id, name: sub.name, error: err.message });
        }
    }

    return NextResponse.json({ ...results, reminders: reminderResults });
}

const MAX_CATCHUP = 12;

function advance(date: Date, cycle: string): Date {
    if (cycle === 'yearly') return addYears(date, 1);
    if (cycle === 'weekly') return addWeeks(date, 1);
    if (cycle === 'bi-weekly') return addWeeks(date, 2);
    return addMonths(date, 1);
}

/**
 * Este cron usa la service_role, que se salta RLS: por eso comprueba explícitamente que todas
 * las cuentas y la categoría referenciadas por la suscripción pertenecen a su dueño. Sin esto,
 * un usuario podría crear una suscripción que apunte a la cuenta de otro y el cron movería
 * ese saldo.
 */
async function assertOwnership(supabase: any, userId: string, accountIds: string[], categoryId: string | null) {
    const ids = Array.from(new Set(accountIds.filter(Boolean)));
    const { data: owned, error } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', userId)
        .in('id', ids);
    if (error) throw error;
    if ((owned || []).length !== ids.length) {
        throw new Error('Subscription references an account not owned by its user');
    }
    if (categoryId) {
        const { data: cat, error: catError } = await supabase
            .from('categories')
            .select('id')
            .eq('user_id', userId)
            .eq('id', categoryId)
            .maybeSingle();
        if (catError) throw catError;
        if (!cat) throw new Error('Subscription references a category not owned by its user');
    }
}

async function createOccurrence(supabase: any, sub: any, accountId: string, type: string, date: string) {
    if (type === 'transfer') {
        // Atómico: bloquea ambas cuentas, comprueba que son de sub.user_id, inserta la
        // transacción y ajusta los dos saldos en una sola transacción SQL.
        const { error } = await supabase.rpc('create_transfer', {
            p_from_account_id: accountId,
            p_to_account_id: sub.to_account_id,
            p_amount: Number(sub.amount),
            p_transaction_date: date,
            p_description: `${sub.name} - Transferencia automática`,
            p_category_id: sub.category_id || null,
            p_enforce_balance: false,
            p_user_id: sub.user_id,
        });
        if (error) throw error;
        return;
    }

    const { error: txError } = await supabase.from('transactions').insert({
        user_id: sub.user_id,
        account_id: accountId,
        amount: sub.amount,
        type,
        description: `${sub.name} - ${type === 'income' ? 'Ingreso automático' : 'Pago Recurrente'}`,
        category_id: sub.category_id,
        transaction_date: date,
    });
    if (txError) throw txError;
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
