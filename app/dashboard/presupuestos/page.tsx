import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BudgetForm from '@/components/budgets/BudgetForm';
import BudgetList from '@/components/budgets/BudgetList';
import { getBudgetProgress } from '@/lib/actions/budgets';

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
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-neutral-900 mb-2">
                    Presupuestos
                </h1>
                <p className="text-neutral-600">
                    Define límites de gasto para tus categorías y controla tu dinero.
                </p>
            </div>

            <BudgetForm categories={categories || []} />

            <div className="mt-8">
                <h2 className="text-xl font-bold text-neutral-900 mb-4">Tus Presupuestos</h2>
                <BudgetList budgets={budgets || []} />
            </div>
        </div>
    );
}
