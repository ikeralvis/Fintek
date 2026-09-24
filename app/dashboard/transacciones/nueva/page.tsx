import TransactionForm from '@/components/dashboard/TransactionForm';

// Cuentas y categorías ya las carga el layout del dashboard (DashboardContext): no se vuelven
// a pedir aquí, así la pantalla es instantánea al navegar desde cualquier sitio de la app.
export default function NewTransactionPage() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-0 sm:p-4">
            <div className="w-full max-w-lg h-full sm:h-auto">
                <TransactionForm />
            </div>
        </div>
    );
}
