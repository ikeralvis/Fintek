import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(_request: Request) {
    // Verify authorization (optional but recommended: check for a secret header)
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new NextResponse('Unauthorized', { status: 401 });
    // }

    const supabase = await createClient();

    try {
        // 1. Get active recurring transactions due for processing
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

        // 2. Process each transaction
        for (const rt of recurring) {
            // Create the transaction
            const { error: insertError } = await supabase
                .from('transactions')
                .insert({
                    user_id: rt.user_id,
                    account_id: rt.account_id,
                    category_id: rt.category_id,
                    amount: rt.amount,
                    type: rt.type,
                    description: rt.description || `Recurring: ${rt.frequency}`,
                    transaction_date: rt.next_run_date, // Use the scheduled date
                });

            if (insertError) {
                console.error(`Failed to process recurring ${rt.id}:`, insertError);
                results.push({ id: rt.id, status: 'error', error: insertError.message });
                continue;
            }

            // Update account balance
            const { data: account, error: accountError } = await supabase
                .from('accounts')
                .select('current_balance')
                .eq('id', rt.account_id)
                .single();

            if (accountError) {
                console.error(`Failed to get account ${rt.account_id}:`, accountError);
            } else {
                const balanceChange = rt.type === 'income' ? rt.amount : -rt.amount;
                const newBalance = account.current_balance + balanceChange;
                
                const { error: balanceError } = await supabase
                    .from('accounts')
                    .update({ current_balance: newBalance })
                    .eq('id', rt.account_id);

                if (balanceError) {
                    console.error(`Failed to update balance for ${rt.account_id}:`, balanceError);
                }
            }

            // Calculate next run date
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

            // Update the recurring transaction
            const { error: updateError } = await supabase
                .from('recurring_transactions')
                .update({
                    next_run_date: nextDate.toISOString().split('T')[0],
                    updated_at: new Date().toISOString()
                })
                .eq('id', rt.id);

            if (updateError) {
                console.error(`Failed to update recurring ${rt.id}:`, updateError);
                results.push({ id: rt.id, status: 'error_updating_date', error: updateError.message });
            } else {
                results.push({ id: rt.id, status: 'success', next_run: nextDate.toISOString().split('T')[0] });
            }
        }

        return NextResponse.json({
            success: true,
            processed: results.length,
            results
        });

    } catch (error: any) {
        console.error('Cron job error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
