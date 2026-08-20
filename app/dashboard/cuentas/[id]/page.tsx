import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import AccountDetailView from '@/components/dashboard/AccountDetailView';

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Fetch Account, Transactions (including incoming transfers), Categories and all Accounts (for transfer editing) in parallel
    const [accountRes, outgoingTxRes, incomingTransfersRes, categoriesRes, allAccountsRes] = await Promise.all([
        supabase
            .from('accounts')
            .select('*, banks(id, name, color, logo_url)')
            .eq('id', id)
            .eq('user_id', user.id)
            .single(),

        // Transacciones normales + transferencias salientes
        supabase
            .from('transactions')
            .select('*, categories(id, name, icon, color)')
            .eq('account_id', id)
            .eq('user_id', user.id)
            .order('transaction_date', { ascending: false })
            .limit(500),

        // Transferencias entrantes (donde esta cuenta es el destino)
        supabase
            .from('transactions')
            .select('*, categories(id, name, icon, color)')
            .eq('related_account_id', id)
            .eq('user_id', user.id)
            .eq('type', 'transfer')
            .order('transaction_date', { ascending: false })
            .limit(100),

        supabase
            .from('categories')
            .select('*')
            .eq('user_id', user.id),

        supabase
            .from('accounts')
            .select('*, banks(id, name, color, logo_url)')
            .eq('user_id', user.id)
            .eq('is_active', true)
    ]);

    if (accountRes.error || !accountRes.data) {
        console.error('Account not found or error:', accountRes.error);
        notFound();
    }

    // Combinar transacciones: las normales + transferencias entrantes transformadas
    const outgoingTransactions = outgoingTxRes.data || [];
    const incomingTransfers = (incomingTransfersRes.data || []).map(t => ({
        ...t,
        // Marcar como transferencia entrante para mostrar como +dinero
        // (account_id/related_account_id se mantienen intactos: origen real -> esta cuenta,
        // así el modal de edición puede mostrar las cuentas reales de la transferencia)
        isIncomingTransfer: true,
    }));

    // Combinar y ordenar por fecha
    const allTransactions = [...outgoingTransactions, ...incomingTransfers]
        .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());

    return (
        <AccountDetailView
            account={accountRes.data}
            initialTransactions={allTransactions}
            categories={categoriesRes.data || []}
            accounts={allAccountsRes.data || []}
        />
    );
}

