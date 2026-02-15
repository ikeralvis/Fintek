import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { addMonths, addWeeks, addYears, parseISO, format } from 'date-fns';

export async function GET(request: Request) {
    // SECURITY: In a real app, verify a CRON_SECRET header to prevent unauthorized access.
    // For this prototype, we'll allow it but you should call it manually or via cron.

    const supabase = await createClient();

    // 1. Get Subscriptions DUE TODAY or BEFORE (active only)
    const today = new Date().toISOString().split('T')[0];

    const { data: dueSubs, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('status', 'active')
        .lte('next_payment_date', today);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!dueSubs || dueSubs.length === 0) {
        return NextResponse.json({ message: 'No subscriptions due today.' });
    }

    const results = {
        processed: 0,
        errors: 0,
        details: [] as any[]
    };

    for (const sub of dueSubs) {
        try {
            // A. Create Transaction
            const accountId = sub.account_id || (await getDefaultAccountId(supabase, sub.user_id));
            
            if (!accountId) {
                throw new Error('No account available for subscription');
            }

            const { error: txError } = await supabase.from('transactions').insert({
                user_id: sub.user_id,
                account_id: accountId,
                amount: sub.amount,
                type: 'expense',
                description: `${sub.name} - Pago Recurrente 🔄`,
                category_id: sub.category_id,
                transaction_date: new Date().toISOString()
            });

            if (txError) throw txError;

            // B. Update Account Balance
            const { data: account, error: accountError } = await supabase
                .from('accounts')
                .select('current_balance')
                .eq('id', accountId)
                .single();

            if (accountError) throw accountError;

            const newBalance = account.current_balance - sub.amount;
            const { error: balanceError } = await supabase
                .from('accounts')
                .update({ current_balance: newBalance })
                .eq('id', accountId);

            if (balanceError) throw balanceError;

            // C. Calculate Next Payment Date
            const currentNext = parseISO(sub.next_payment_date);
            let newNextDate = currentNext;

            if (sub.billing_cycle === 'monthly') newNextDate = addMonths(currentNext, 1);
            if (sub.billing_cycle === 'yearly') newNextDate = addYears(currentNext, 1);
            if (sub.billing_cycle === 'weekly') newNextDate = addWeeks(currentNext, 1);
            if (sub.billing_cycle === 'bi-weekly') newNextDate = addWeeks(currentNext, 2);

            // D. Update Subscription
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

    return NextResponse.json(results);
}

// Helper: Get first available checking account if legacy sub has null account
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
