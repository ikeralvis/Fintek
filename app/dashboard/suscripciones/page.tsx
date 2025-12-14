import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import SubscriptionForm from '@/components/dashboard/SubscriptionForm';
import SubscriptionList from '@/components/dashboard/SubscriptionList';
import { getRecurringTransactions } from '@/lib/actions/recurring';

export default async function SuscripcionesPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // 1. Obtener Cuentas (para el formulario)
    const { data: accounts } = await supabase
        .from('accounts')
        .select(`
      id,
      name,
      banks (
        name
      )
    `)
        .eq('user_id', user.id)
        .order('name', { ascending: true });

    // 2. Obtener Categorías (para el formulario)
    const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

    // 3. Obtener Suscripciones (Recurrentes tipo gasto)
    const { data: allRecurring } = await getRecurringTransactions();

    // Filtrar solo gastos (subscriptions)
    const subscriptions = allRecurring
        ? allRecurring.filter((t: any) => t.type === 'expense')
        : [];

    return (
        <div className="container mx-auto px-4 py-12 max-w-7xl">
            {/* Header */}
            <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2.5 bg-violet-50 rounded-xl">
                            <RefreshCw className="h-6 w-6 text-violet-600" />
                        </div>
                        <h1 className="text-4xl font-bold text-neutral-900 tracking-tight">Suscripciones</h1>
                    </div>
                    <p className="text-lg text-neutral-500 font-medium ml-12">
                        Controla tus gastos recurrentes y evita sorpresas
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Sidebar: Formulario */}
                <div className="lg:col-span-4">
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-card border border-white/50 p-6 sticky top-8">
                        <h2 className="text-lg font-bold text-neutral-900 mb-6 flex items-center">
                            <span className="w-1 h-6 bg-violet-500 rounded-full mr-3"></span>
                            Nueva Suscripción
                        </h2>
                        <SubscriptionForm
                            accounts={
                                (accounts || []).map((account: any) => ({
                                    id: account.id,
                                    name: account.name,
                                    banks: { name: account.banks?.name || '' }
                                }))
                            }
                            categories={categories || []}
                        />
                    </div>
                </div>

                {/* Lista de suscripciones */}
                <div className="lg:col-span-8">
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-neutral-900">Tus Suscripciones Activas</h2>
                            <span className="text-sm font-medium text-violet-600 bg-violet-50 px-3 py-1 rounded-full border border-violet-100">
                                {subscriptions.length} activas
                            </span>
                        </div>
                        <SubscriptionList subscriptions={subscriptions} />
                    </div>
                </div>
            </div>
        </div>
    );
}
