import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TransactionForm from '@/components/dashboard/TransactionForm';

// Mock server actions
vi.mock('@/lib/actions/transactions', () => ({
    createTransaction: vi.fn(),
}));

describe('TransactionForm Persistence', () => {
    const mockAccounts = [{ id: '1', name: 'Bank 1', current_balance: 0, banks: { name: 'Test Bank', color: '#000000' } }];
    const mockCategories = [{ id: '1', name: 'Food' }];

    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('saves form data to localStorage on input change', async () => {
        render(<TransactionForm accounts={mockAccounts} categories={mockCategories} />);

        const amountInput = screen.getByPlaceholderText('0.00');
        fireEvent.change(amountInput, { target: { value: '50' } });

        // Wait for debounce
        await waitFor(() => {
            const saved = localStorage.getItem('transactionFormDraft');
            expect(saved).toBeTruthy();
            expect(JSON.parse(saved!).amount).toBe('50');
        }, { timeout: 1000 });
    });

    it('loads amount from localStorage on mount', () => {
        localStorage.setItem('transactionFormDraft', JSON.stringify({
            type: 'expense',
            accountId: '',
            categoryId: '',
            amount: '99.99',
            description: '',
            transactionDate: '2025-01-01'
        }));

        render(<TransactionForm accounts={mockAccounts} categories={mockCategories} />);

        const amountInput = screen.getByPlaceholderText('0.00') as HTMLInputElement;
        expect(amountInput.value).toBe('99.99');
    });
});
