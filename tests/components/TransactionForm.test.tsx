import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import TransactionForm from '@/components/dashboard/TransactionForm';

// TransactionForm ya no autoguarda un borrador en localStorage (esa función se retiró).
// Lo único que persiste hoy es la última cuenta usada, para no tener que reabrir el
// selector cada vez — estos tests cubren ese comportamiento real en vez del descontinuado.
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/lib/DashboardContext', () => ({
    useDashboard: () => ({ transactions: [] }),
}));

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
        from: () => ({ insert: () => Promise.resolve({ error: null }) }),
    }),
}));

describe('TransactionForm — última cuenta usada', () => {
    const mockAccounts = [
        { id: 'acc-1', name: 'Bank 1', current_balance: 0, banks: { name: 'Test Bank', color: '#000000' } },
        { id: 'acc-2', name: 'Bank 2', current_balance: 0, banks: { name: 'Test Bank', color: '#000000' } },
    ];
    const mockCategories = [{ id: '1', name: 'Food' }];

    beforeEach(() => {
        localStorage.clear();
    });

    it('usa la primera cuenta (favorita) por defecto cuando no hay nada guardado', () => {
        render(<TransactionForm accounts={mockAccounts} categories={mockCategories} />);
        expect(screen.getByText('Bank 1')).toBeInTheDocument();
    });

    it('restaura la última cuenta usada desde localStorage al montar', () => {
        localStorage.setItem('fintek:lastAccountId', 'acc-2');
        render(<TransactionForm accounts={mockAccounts} categories={mockCategories} />);
        expect(screen.getByText('Bank 2')).toBeInTheDocument();
    });

    it('ignora un id guardado que ya no existe entre las cuentas actuales', () => {
        localStorage.setItem('fintek:lastAccountId', 'acc-deleted');
        render(<TransactionForm accounts={mockAccounts} categories={mockCategories} />);
        expect(screen.getByText('Bank 1')).toBeInTheDocument();
    });
});
