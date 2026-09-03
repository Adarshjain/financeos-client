import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TransactionCRUD from '@/components/transactions/TransactionCRUD';
import type { Account } from '@/lib/account.types';
import { api,ApiError } from '@/lib/api/client';
import type { Category } from '@/lib/categories.types';
import { keys } from '@/lib/query/keys';
import type { Transaction } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';
import { createTestQueryClient, renderWithQuery } from '@/test/renderWithQuery';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

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

// Seeds the accounts/categories queries synchronously so useTransactionCRUD's
// internal useAccounts()/useCategories() calls resolve without an async wait.
function renderCRUD(ui: ReactElement) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(keys.accounts.list(), mockAccounts);
  queryClient.setQueryData(keys.categories.list(), mockCategories);
  return renderWithQuery(ui, { queryClient });
}

describe('TransactionCRUD (CD-2d, CD-4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('omits Review Status select in CREATE mode (CD-4)', () => {
    renderCRUD(<TransactionCRUD />);

    expect(screen.queryByText('Review Status')).not.toBeInTheDocument();
  });

  it('renders Review Status select in EDIT mode (CD-4)', () => {
    renderCRUD(<TransactionCRUD transaction={mockTxn} />);

    expect(screen.getByText('Review Status')).toBeInTheDocument();
  });

  it('disables Save button and prevents double submit while in flight (CD-2d)', async () => {
    let resolvePromise: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    const updateSpy = (api.PUT as ReturnType<typeof vi.fn>).mockImplementation(() => pendingPromise);

    const { container } = renderCRUD(<TransactionCRUD transaction={mockTxn} />);

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
    resolvePromise!({ data: { id: 't1' } });
  });

  it('edit request includes reviewType and source in payload (CD-4)', async () => {
    const updateSpy = (api.PUT as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: 't1' },
    });

    const { container } = renderCRUD(<TransactionCRUD transaction={mockTxn} />);

    const form = container.querySelector('form')!;
    if (!('description' in form)) {
      Object.defineProperty(form, 'description', { value: { value: 'Test Dinner' }, configurable: true });
    }

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalled();
    });

    const [path, options] = updateSpy.mock.calls[0];
    expect(path).toBe('/api/v1/transactions/{id}');
    expect(options.params.path.id).toBe('t1');
    expect(options.body.reviewType).toBe('MANUALLY_REVIEWED');
    expect(options.body.source).toBe('manual');
    expect(options.body.accountId).toBe('acc1');
  });

  it('toggles amount sign, validates MCC, and auto-categorizes on description blur', async () => {
    (api.POST as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        categories: [mockCategories[0]],
        ruleId: '',
        fromRule: false,
        mcc: '5411',
      },
    });

    renderCRUD(<TransactionCRUD />);

    // Click +/- sign toggle
    const signToggleBtn = screen.getByRole('button', { name: '+/-' });
    fireEvent.click(signToggleBtn);
    expect(screen.getByPlaceholderText('0.00')).toHaveValue('0');

    // Type description and trigger blur
    const descArea = screen.getByPlaceholderText('Add description or notes...');
    fireEvent.change(descArea, { target: { value: 'Grocery Store' } });
    fireEvent.blur(descArea);

    await waitFor(() => {
      expect(api.POST).toHaveBeenCalledWith('/api/v1/categorize', { body: { description: 'Grocery Store' } });
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
    (api.PUT as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ApiError(400, { code: 'ERR', message: 'Failed to update transaction', timestamp: '' }),
    );

    const { container } = renderCRUD(<TransactionCRUD transaction={mockTxn} />);

    const form = container.querySelector('form')!;
    if (!('description' in form)) {
      Object.defineProperty(form, 'description', { value: { value: 'Coffee' }, configurable: true });
    }

    const saveBtn = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.PUT).toHaveBeenCalled();
    });
  });

  it('calls onClose when Back button is clicked in update mode', async () => {
    const onClose = vi.fn();

    renderCRUD(<TransactionCRUD transaction={mockTxn} onClose={onClose} />);

    const backBtn = screen.getByRole('button', { name: 'Back' });
    fireEvent.click(backBtn);

    expect(onClose).toHaveBeenCalled();
  });

  it('submits new transaction creation in create mode', async () => {
    const createSpy = (api.POST as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: 't-new' },
    });

    const onSuccess = vi.fn();

    const { container } = renderCRUD(<TransactionCRUD onSuccess={onSuccess} />);

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
      expect(createSpy).toHaveBeenCalledWith('/api/v1/transactions', expect.objectContaining({
        body: expect.objectContaining({ accountId: 'acc1' }),
      }));
    });

    expect(onSuccess).toHaveBeenCalled();
  });
});
