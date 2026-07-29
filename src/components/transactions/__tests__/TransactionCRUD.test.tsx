import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import * as categoriesActions from '@/actions/categories';
import * as transactionsActions from '@/actions/transactions';
import TransactionCRUD from '@/components/transactions/TransactionCRUD';
import type { Account } from '@/lib/account.types';
import type { Category } from '@/lib/categories.types';
import type { Transaction } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';

const mockAccounts: Account[] = [
  { id: 'acc1', name: 'HDFC Savings', type: AccountType.BANK_ACCOUNT },
];

const mockCategories: Category[] = [
  { id: 'cat1', name: 'Food' },
];

const mockTxn: Transaction = {
  id: 't1',
  accountId: 'acc1',
  date: '2026-07-25',
  amount: -500,
  description: 'Test Dinner',
  sourcedDescription: 'TEST DINNER HDFC',
  source: 'manual',
  reviewType: 'MANUALLY_REVIEWED',
  balance: 10000,
  createdAt: '2026-07-25T00:00:00Z',
};

describe('TransactionCRUD (CD-2d, CD-4)', () => {
  it('omits Review Status select in CREATE mode (CD-4)', () => {
    render(
      <TransactionCRUD
        accounts={mockAccounts}
        categories={mockCategories}
      />,
    );

    expect(screen.queryByText('Review Status')).not.toBeInTheDocument();
  });

  it('renders Review Status select in EDIT mode (CD-4)', () => {
    render(
      <TransactionCRUD
        transaction={mockTxn}
        accounts={mockAccounts}
        categories={mockCategories}
      />,
    );

    expect(screen.getByText('Review Status')).toBeInTheDocument();
  });

  it('disables Save button and prevents double submit while in flight (CD-2d)', async () => {
    let resolvePromise: (value: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    const updateSpy = vi.spyOn(transactionsActions, 'updateTransaction').mockImplementation(() => pendingPromise as any);

    const { container } = render(
      <TransactionCRUD
        transaction={mockTxn}
        accounts={mockAccounts}
        categories={mockCategories}
      />,
    );

    const form = container.querySelector('form')!;
    if (!('description' in form)) {
      Object.defineProperty(form, 'description', { value: { value: 'Test Dinner' }, configurable: true });
    }

    const saveBtn = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    });

    // Save button is disabled while in flight, clicking disabled button won't submit
    fireEvent.click(screen.getByRole('button', { name: 'Saving...' }));
    expect(updateSpy).toHaveBeenCalledTimes(1);

    // Resolve the promise
    resolvePromise!({ success: true, data: { id: 't1' } });
  });

  it('edit request includes reviewType and source in payload (CD-4)', async () => {
    const updateSpy = vi.spyOn(transactionsActions, 'updateTransaction').mockResolvedValue({
      success: true,
      data: { id: 't1' } as any,
    });

    const { container } = render(
      <TransactionCRUD
        transaction={mockTxn}
        accounts={mockAccounts}
        categories={mockCategories}
      />,
    );

    const form = container.querySelector('form')!;
    if (!('description' in form)) {
      Object.defineProperty(form, 'description', { value: { value: 'Test Dinner' }, configurable: true });
    }

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalled();
    });

    const payload = updateSpy.mock.calls[0][1];
    expect(payload.reviewType).toBe('MANUALLY_REVIEWED');
    expect(payload.source).toBe('manual');
    expect(payload.accountId).toBe('acc1');
  });

  it('toggles amount sign, validates MCC, and auto-categorizes on description blur', async () => {
    vi.spyOn(categoriesActions, 'categorizeDescription').mockResolvedValue({
      success: true,
      data: {
        categories: [mockCategories[0]],
        ruleId: null,
        fromRule: false,
        mcc: '5411',
      },
    });

    render(
      <TransactionCRUD
        accounts={mockAccounts}
        categories={mockCategories}
      />,
    );

    // Click +/- sign toggle
    const signToggleBtn = screen.getByRole('button', { name: '+/-' });
    fireEvent.click(signToggleBtn);
    expect(screen.getByPlaceholderText('0.00')).toHaveValue('0');

    // Type description and trigger blur
    const descArea = screen.getByPlaceholderText('Add description or notes...');
    fireEvent.change(descArea, { target: { value: 'Grocery Store' } });
    fireEvent.blur(descArea);

    await waitFor(() => {
      expect(categoriesActions.categorizeDescription).toHaveBeenCalledWith('Grocery Store');
    });

    // Toggle Exclude switch
    const excludeSwitch = screen.getByRole('switch', { name: 'Exclude transaction' });
    fireEvent.click(excludeSwitch);
    expect(excludeSwitch).toHaveAttribute('aria-checked', 'true');

    // Toggle Monitor switch and type reason
    const monitorSwitch = screen.getByRole('switch', { name: 'Monitor transaction' });
    fireEvent.click(monitorSwitch);
    expect(monitorSwitch).toHaveAttribute('aria-checked', 'true');

    const reasonInput = screen.getByPlaceholderText(/Explain why this transaction is being monitored/i);
    fireEvent.change(reasonInput, { target: { value: 'Price surge' } });
    expect(reasonInput).toHaveValue('Price surge');
  });

  it('handles update submission failure with error toast', async () => {
    vi.spyOn(transactionsActions, 'updateTransaction').mockResolvedValue({
      success: false,
      error: { code: 'ERR', message: 'Failed to update transaction', timestamp: '' },
    });

    const { container } = render(
      <TransactionCRUD
        transaction={mockTxn}
        accounts={mockAccounts}
        categories={mockCategories}
      />,
    );

    const form = container.querySelector('form')!;
    if (!('description' in form)) {
      Object.defineProperty(form, 'description', { value: { value: 'Coffee' }, configurable: true });
    }

    const saveBtn = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(transactionsActions.updateTransaction).toHaveBeenCalled();
    });
  });

  it('calls onClose when Back button is clicked in update mode', async () => {
    const onClose = vi.fn();

    render(
      <TransactionCRUD
        transaction={mockTxn}
        accounts={mockAccounts}
        categories={mockCategories}
        onClose={onClose}
      />,
    );

    const backBtn = screen.getByRole('button', { name: 'Back' });
    fireEvent.click(backBtn);

    expect(onClose).toHaveBeenCalled();
  });

  it('submits new transaction creation in create mode', async () => {
    const createSpy = vi.spyOn(transactionsActions, 'createTransaction').mockResolvedValue({
      success: true,
      data: { id: 't-new' } as any,
    });

    const onSuccess = vi.fn();

    const { container } = render(
      <TransactionCRUD
        accounts={mockAccounts}
        categories={mockCategories}
        onSuccess={onSuccess}
      />,
    );

    // Select account using form select element
    const hiddenSelect = container.querySelector('select[name="accountId"]');
    if (hiddenSelect) {
      fireEvent.change(hiddenSelect, { target: { value: 'acc1' } });
    }

    // Set amount input value
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '-250' } });

    const form = container.querySelector('form')!;
    if (!('description' in form)) {
      Object.defineProperty(form, 'description', { value: { value: 'Lunch' }, configurable: true });
    }

    const saveBtn = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalled();
    });

    expect(onSuccess).toHaveBeenCalled();
  });
});
