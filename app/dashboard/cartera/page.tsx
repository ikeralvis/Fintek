import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import WalletView from '@/components/dashboard/WalletView';
import { AlertTriangle } from 'lucide-react';

export default async function CarteraPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Try to find an existing 'wallet' type account
    // If 'type' column is missing, this will return an error.
    const { data: accounts, error: fetchError } = await supabase
        .from('accounts')
        .select('*, banks(id, name, color)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('type', 'wallet'); // This fails if column 'type' missing

    // Handle Schema Mismatch (Missing 'type' column)
    if (fetchError && fetchError.message.includes('Could not find the \'type\' column')) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 max-w-2xl mx-auto text-center shadow-sm">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-amber-900 mb-2">Actualización Necesaria</h2>
                    <p className="text-amber-800 mb-6">
                        Para usar la Cartera, necesitamos actualizar tu base de datos (añadir el campo "tipo" a las cuentas).
                    </p>
                    <div className="bg-white p-4 rounded-xl border border-amber-100 text-left text-sm font-mono text-neutral-600 overflow-x-auto">
                        <p className="mb-2 text-neutral-400">// Ejecuta esto en Supabase SQL Editor:</p>
                        <p className="whitespace-pre">
                            {`ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS type text CHECK (type IN ('checking', 'savings', 'wallet')) DEFAULT 'checking';

ALTER TABLE accounts 
ALTER COLUMN bank_id DROP NOT NULL;`}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    let walletAccount = accounts?.[0];

    // If no wallet account exists (and no schema error), create a default one
    if (!walletAccount && !fetchError) {
        const { data: newWallet, error: createError } = await supabase
            .from('accounts')
            .insert([{
                user_id: user.id,
                name: 'Mi Cartera',
                type: 'wallet',
                current_balance: 0,
                is_favorite: true,
                bank_id: null
            }])
            .select()
            .single();

        if (createError) {
            console.error("Error creating wallet:", createError);
            return (
                <div className="p-8 text-center text-rose-500">
                    <p>Error al crear cartera: {createError.message}</p>
                </div>
            );
        }
        walletAccount = newWallet;
    }

    if (!walletAccount) {
        return <div className="p-8 text-center text-rose-500">Error: No se pudo cargar la cartera.</div>;
    }

    // Manually inject the "Cartera" style props if they are missing because bank is null
    const walletWithStyle = {
        ...walletAccount,
        banks: walletAccount.banks || { name: 'Efectivo', color: '#10b981' } // Default Emerald for Wallet
    };

    const { data: transactions } = await supabase
        .from('transactions')
        .select('*, categories(id, name, icon, color)')
        .eq('account_id', walletAccount.id)
        .order('transaction_date', { ascending: false })
        .limit(20);

    return (
        <WalletView
            account={walletWithStyle}
            initialTransactions={transactions || []}
        />
    );
}
