import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CreditCard, Wallet } from 'lucide-react';
import CreateAccountForm from '@/components/dashboard/CreateAccountForm';
import AccountCard from '@/components/dashboard/AccountCard';
import { getAccountStats } from '@/lib/actions/accounts';
import { formatCurrency } from '@/lib/utils';

export default async function CuentasPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Obtener bancos
    const { data: banks } = await supabase
        .from('banks')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

    // Obtener cuentas con información del banco
    const { data: accounts } = await supabase
        .from('accounts')
        .select(`
      *,
      banks (
        id,
        name
      )
    `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    // Calcular balance total
    const totalBalance = accounts?.reduce((sum, acc) => sum + acc.current_balance, 0) || 0;

    // Obtener estadísticas de cada cuenta
    const accountsWithStats = await Promise.all(
        (accounts || []).map(async (account) => {
            const stats = await getAccountStats(account.id);
            return {
                ...account,
                monthlyIncome: stats.data?.monthlyIncome || 0,
                monthlyExpense: stats.data?.monthlyExpense || 0,
            };
        })
    );

    return (
        <div className="min-h-screen bg-neutral-50/50">
            <div className="container mx-auto px-4 py-12 max-w-7xl">
                {/* Header */}
                <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-bold text-neutral-900 tracking-tight mb-2">Mis Cuentas</h1>
                        <p className="text-lg text-neutral-500 font-medium">
                            Gestiona tus cuentas bancarias y visualiza tus saldos
                        </p>
                    </div>
                    <div className="p-3 bg-white rounded-full shadow-sm border border-neutral-200">
                        <CreditCard className="h-6 w-6 text-primary-600" />
                    </div>
                </div>

                {/* Resumen Total */}
                <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl shadow-strong p-8 mb-10 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-blue-200 font-medium mb-1 uppercase tracking-wider text-sm">Patrimonio Total</p>
                            <p className="text-5xl font-bold tracking-tight">{formatCurrency(totalBalance)}</p>
                            <p className="text-blue-200 mt-3 font-medium bg-white/10 inline-block px-3 py-1 rounded-full backdrop-blur-md border border-white/10 text-sm">
                                {accounts?.length || 0} {accounts?.length === 1 ? 'cuenta activa' : 'cuentas activas'}
                            </p>
                        </div>
                        <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10 hidden md:block shadow-lg">
                            <Wallet className="h-10 w-10 text-white" />
                        </div>
                    </div>
                </div>

                {/* Formulario de Nueva Cuenta */}
                <div className="mb-10">
                    <CreateAccountForm banks={banks || []} />
                </div>

                {/* Lista de Cuentas */}
                {accountsWithStats.length === 0 ? (
                    <div className="bg-white/60 backdrop-blur-md rounded-3xl shadow-card border border-white/50 p-12 text-center">
                        <CreditCard className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-neutral-900 mb-2">
                            No tienes cuentas creadas
                        </h2>
                        <p className="text-neutral-500 mb-6 max-w-sm mx-auto">
                            Crea tu primera cuenta para comenzar a registrar transacciones
                        </p>
                    </div>
                ) : (
                    <div>
                        <h2 className="text-xl font-bold text-neutral-900 mb-6 tracking-tight flex items-center">
                            <div className="w-1 h-6 bg-blue-600 rounded-full mr-3"></div>
                            Todas tus Cuentas ({accountsWithStats.length})
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {accountsWithStats.map((account) => (
                                <AccountCard
                                    key={account.id}
                                    account={account}
                                    monthlyIncome={account.monthlyIncome}
                                    monthlyExpense={account.monthlyExpense}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}