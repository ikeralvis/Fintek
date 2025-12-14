import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BudgetForm from '@/components/budgets/BudgetForm';
import BudgetList from '@/components/budgets/BudgetList';
import { getBudgetProgress } from '@/lib/actions/budgets';
import { Target } from 'lucide-react';

export default async function BudgetsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Fetch categories for the form
    const { data: categories } = await supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name');

    // Fetch budgets with progress
    const { data: budgets, error } = await getBudgetProgress();

    if (error) {
        console.error('Error loading budgets:', error);
    }

    return (
        <div className="container mx-auto px-4 py-12 max-w-7xl">
            <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2.5 bg-amber-50 rounded-xl">
                            <Target className="h-6 w-6 text-amber-600" />
                        </div>
                        <h1 className="text-4xl font-bold text-neutral-900 tracking-tight">Presupuestos</h1>
                    </div>
                    <p className="text-lg text-neutral-500 font-medium ml-12">
                        Define límites de gasto y controla tu dinero
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Formulario */}
                <div className="lg:col-span-4">
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-card border border-white/50 p-6 sticky top-8">
                        <h2 className="text-lg font-bold text-neutral-900 mb-6 flex items-center">
                            <span className="w-1 h-6 bg-amber-500 rounded-full mr-3"></span>
                            Nuevo Objetivo
                        </h2>
                        <BudgetForm categories={categories || []} />
                    </div>
                </div>

                {/* Lista */}
                <div className="lg:col-span-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-neutral-900">Tus Presupuestos Activos</h2>
                        <span className="text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                            {budgets?.length || 0} activos
                        </span>
                    </div>
                    <div className="bg-white/60 backdrop-blur-lg rounded-3xl p-1">
                        <BudgetList budgets={budgets || []} />
                    </div>
                </div>
            </div>
        </div>
    );
}
