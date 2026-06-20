import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = createAdminClient();

    try {
        const today = new Date().toISOString().split('T')[0];

        const { data: recurring, error: fetchError } = await supabase
            .from('recurring_transactions')
            .select('*')
            .eq('active', true)
            .lte('next_run_date', today);

        if (fetchError) throw fetchError;

        if (!recurring || recurring.length === 0) {
            return NextResponse.json({ message: 'No recurring transactions to process' });
        }

        const results = [];

        for (const rt of recurring) {
            const { error: insertError } = await supabase
                .from('transactions')
                .insert({
                    user_id: rt.user_id,
                    account_id: rt.account_id,
                    category_id: rt.category_id,
                    amount: rt.amount,
                    type: rt.type,
                    description: rt.description || `Recurrente: ${rt.frequency}`,
                    transaction_date: rt.next_run_date,
                });

            if (insertError) {
                console.error(`Failed to process recurring ${rt.id}:`, insertError);
                results.push({ id: rt.id, status: 'error', error: insertError.message });
                continue;
            }

            // Balance updated automatically by DB trigger — no manual update needed

            const currentRunDate = new Date(rt.next_run_date);
            const nextDate = new Date(currentRunDate);

            switch (rt.frequency) {
                case 'weekly':
                    nextDate.setDate(currentRunDate.getDate() + 7);
                    break;
                case 'monthly':
                    nextDate.setMonth(currentRunDate.getMonth() + 1);
                    break;
                case 'yearly':
                    nextDate.setFullYear(currentRunDate.getFullYear() + 1);
                    break;
            }

            const { error: updateError } = await supabase
                .from('recurring_transactions')
                .update({
                    next_run_date: nextDate.toISOString().split('T')[0],
                    updated_at: new Date().toISOString(),
                })
                .eq('id', rt.id);

            if (updateError) {
                console.error(`Failed to update recurring ${rt.id}:`, updateError);
                results.push({ id: rt.id, status: 'error_updating_date', error: updateError.message });
            } else {
                results.push({ id: rt.id, status: 'success', next_run: nextDate.toISOString().split('T')[0] });
            }
        }

        return NextResponse.json({ success: true, processed: results.length, results });
    } catch (error: any) {
        console.error('Cron job error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
