import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { subDays, subMonths, startOfMonth, format } from 'date-fns';
import { computeSpendingAnalysis } from '@/lib/utils/spendingPrediction';
import { sendPushToUser } from '@/lib/push/sendToUser';

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

        const alerts = await sendBudgetAndInvestmentAlerts(supabase);

        if (!recurring || recurring.length === 0) {
            return NextResponse.json({ message: 'No recurring transactions to process', alerts });
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

        return NextResponse.json({ success: true, processed: results.length, results, alerts });
    } catch (error: any) {
        console.error('Cron job error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function sendBudgetAndInvestmentAlerts(supabase: any) {
    const { data: settings } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('push_enabled', true);

    if (!settings || settings.length === 0) return { sent: 0 };

    const now = new Date();
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
    const analysisStart = subMonths(startOfMonth(now), 11).toISOString();
    const sevenDaysAgo = format(subDays(now, 7), 'yyyy-MM-dd');

    let sent = 0;

    for (const s of settings) {
        const userId = s.user_id;

        if (s.budget_alerts || s.ai_estimate_alerts) {
            const [{ data: budgets }, { data: categories }, { data: monthTx }] = await Promise.all([
                supabase.from('budgets').select('*').eq('user_id', userId),
                supabase.from('categories').select('*').eq('user_id', userId),
                supabase.from('transactions').select('amount, type, category_id, transaction_date')
                    .eq('user_id', userId).in('type', ['expense', 'transfer']).gte('transaction_date', monthStart),
            ]);

            if (budgets && budgets.length > 0 && categories) {
                const spendingMap: Record<string, number> = {};
                (monthTx || []).forEach((t: any) => {
                    if (t.category_id) spendingMap[t.category_id] = (spendingMap[t.category_id] || 0) + t.amount;
                });

                if (s.budget_alerts) {
                    for (const b of budgets) {
                        const spent = spendingMap[b.category_id] || 0;
                        const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
                        if (pct >= s.budget_threshold_percent) {
                            const cat = categories.find((c: any) => c.id === b.category_id);
                            await sendPushToUser(supabase, userId, {
                                title: 'Presupuesto cerca del límite',
                                body: `${cat?.name || 'Categoría'} al ${Math.round(pct)}% de su presupuesto (${Math.round(spent)}€ de ${b.amount}€)`,
                                url: '/dashboard/presupuestos',
                                tag: `budget-${b.id}`,
                            });
                            sent++;
                        }
                    }
                }

                if (s.ai_estimate_alerts) {
                    const { data: expenseHistory } = await supabase
                        .from('transactions')
                        .select('amount, type, category_id, transaction_date')
                        .eq('user_id', userId).eq('type', 'expense')
                        .gte('transaction_date', analysisStart);

                    const analysis = computeSpendingAnalysis(expenseHistory || [], categories, now);
                    for (const c of analysis.categories as any[]) {
                        const budget = budgets.find((b: any) => b.category_id === c.categoryId);
                        if (budget && c.prediction > budget.amount) {
                            await sendPushToUser(supabase, userId, {
                                title: 'Estimación IA',
                                body: `Vas a superar el presupuesto de ${c.name}: se estima ~${c.prediction}€ (límite ${budget.amount}€)`,
                                url: '/dashboard/analisis',
                                tag: `ai-estimate-${budget.id}`,
                            });
                            sent++;
                        }
                    }
                }
            }
        }

        if (s.investment_reminders) {
            const { data: invAccounts } = await supabase
                .from('accounts').select('id, name')
                .eq('user_id', userId).eq('type', 'investment').eq('is_active', true);

            for (const acc of invAccounts || []) {
                const { data: recent } = await supabase
                    .from('investment_snapshots').select('id')
                    .eq('account_id', acc.id).gte('snapshot_date', sevenDaysAgo).limit(1);

                if (!recent || recent.length === 0) {
                    await sendPushToUser(supabase, userId, {
                        title: 'Actualiza tu inversión',
                        body: `Llevas más de 7 días sin registrar el valor de ${acc.name}`,
                        url: '/dashboard/inversiones',
                        tag: `investment-reminder-${acc.id}`,
                    });
                    sent++;
                }
            }
        }
    }

    return { sent };
}
