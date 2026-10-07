import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/toastError', () => ({ toastError: vi.fn() }));
vi.mock('@/components/ui/select', async () => (await import('@/test/mockSelect')).selectMock);

const pickerProps: Record<string, unknown>[] = [];
vi.mock('@/components/transactions/TransactionPicker', () => ({
  TransactionPicker: (props: {
    value: { id: string } | null;
    onSelect: (t: { id: string }) => void;
    onClear: () => void;
  }) => {
    pickerProps.push(props);
    return (
      <div data-testid="picker">
        {props.value ? `chip:${props.value.id}` : 'search'}
        <button onClick={() => props.onSelect({ id: 'tx-new' })}>pick</button>
        <button onClick={props.onClear}>remove</button>
      </div>
    );
  },
}));

import { toast } from 'sonner';

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';
import { renderWithQuery } from '@/test/renderWithQuery';

import { DividendReceiptSection } from '../DividendReceiptSection';
import { makeDividend } from './fixtures';

const LINK = '/api/v1/investments/dividends/{id}/transaction';
const STATUS = '/api/v1/investments/dividends/{id}/receipt-status';

const linkedTxn = { id: 'tx-1', accountId: 'acc1', accountName: 'HDFC', date: '2026-03-10', signedAmount: 900 };

function renderSection(
  dividend = makeDividend(),
  extra: { amount?: string; tds?: string; onUseTds?: (v: string) => void; onSuccess?: () => void } = {},
) {
  const onUseTds = extra.onUseTds ?? vi.fn();
  const onSuccess = extra.onSuccess ?? vi.fn();
  const utils = renderWithQuery(
    <DividendReceiptSection
      dividend={dividend}
      amount={extra.amount ?? String(dividend.amount)}
      tds={extra.tds ?? ''}
      onUseTds={onUseTds}
      onSuccess={onSuccess}
    />,
  );
  return { ...utils, onUseTds, onSuccess };
}

describe('DividendReceiptSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pickerProps.length = 0;
    vi.mocked(api.PUT).mockResolvedValue({ data: {} } as never);
    vi.mocked(api.DELETE).mockResolvedValue({} as never);
  });

  it('shows the status badge and configures the picker for dividend credits', () => {
    renderSection(makeDividend({ amount: 1000, tds: 100, payDate: '2026-03-08', receiptStatus: 'overdue' }));
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('search')).toBeInTheDocument();
    expect(pickerProps[0]).toMatchObject({
      type: 'CREDIT',
      shareableKind: 'DIVIDEND',
      suggestAmount: 900,
      suggestDate: '2026-03-08',
      ruleHint: 'Dividends link money-in (credit) transactions.',
    });
  });

  it('unlinked: picking a transaction PUTs the link with updateTds:false, toasts, invalidates and calls onSuccess', async () => {
    const { queryClient, onSuccess } = renderSection(makeDividend({ id: 'd7' }));
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    fireEvent.click(screen.getByText('pick'));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(api.PUT).toHaveBeenCalledWith(LINK, {
      params: { path: { id: 'd7' } },
      body: { transactionId: 'tx-new', updateTds: false },
    });
    expect(toast.success).toHaveBeenCalledWith('Linked');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.investments.all });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.transactions.all });
  });

  it('linked: the picker receives the linked transaction as its chip value (Change uses the same picker)', async () => {
    renderSection(makeDividend({ id: 'd7', receiptStatus: 'received', transaction: linkedTxn }));
    expect(screen.getByText('chip:tx-1')).toBeInTheDocument();
    expect(pickerProps[0].value).toMatchObject({ id: 'tx-1', accountId: 'acc1', accountName: 'HDFC', signedAmount: 900 });

    fireEvent.click(screen.getByText('pick')); // Change -> select
    await waitFor(() =>
      expect(api.PUT).toHaveBeenCalledWith(LINK, {
        params: { path: { id: 'd7' } },
        body: { transactionId: 'tx-new', updateTds: false },
      }),
    );
  });

  it('linked: removing the chip DELETEs the link, toasts "Unlinked" and refreshes', async () => {
    const { queryClient, onSuccess } = renderSection(makeDividend({ id: 'd7', transaction: linkedTxn }));
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    fireEvent.click(screen.getByText('remove'));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(api.DELETE).toHaveBeenCalledWith(LINK, { params: { path: { id: 'd7' } } });
    expect(toast.success).toHaveBeenCalledWith('Unlinked');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.transactions.all });
  });

  it('reports link / unlink failures and does not call onSuccess', async () => {
    vi.mocked(api.PUT).mockRejectedValue(new Error('x'));
    vi.mocked(api.DELETE).mockRejectedValue(new Error('y'));
    const { onSuccess } = renderSection(makeDividend({ transaction: linkedTxn }));

    fireEvent.click(screen.getByText('pick'));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.any(Error), 'Failed to link transaction'));
    fireEvent.click(screen.getByText('remove'));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.any(Error), 'Failed to unlink transaction'));
    expect(onSuccess).not.toHaveBeenCalled();
  });

  describe('receipt note', () => {
    it('unlinked: lists the three options, current value derived, and PUTs the chosen status', async () => {
      const { onSuccess } = renderSection(makeDividend({ id: 'd7', receiptStatus: 'overdue' }));
      expect(screen.getByTestId('select')).toHaveAttribute('data-value', 'derived');
      expect(screen.getByTestId('select')).toHaveAttribute('data-disabled', 'false');
      expect(screen.getByRole('option', { name: 'Derived automatically' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('option', { name: 'Received in an untracked account' }));
      await waitFor(() => expect(onSuccess).toHaveBeenCalled());
      expect(api.PUT).toHaveBeenCalledWith(STATUS, { params: { path: { id: 'd7' } }, body: { status: 'received_untracked' } });

      fireEvent.click(screen.getByRole('option', { name: 'Not received (chasing)' }));
      await waitFor(() =>
        expect(api.PUT).toHaveBeenCalledWith(STATUS, { params: { path: { id: 'd7' } }, body: { status: 'not_received' } }),
      );
    });

    it('choosing "Derived automatically" clears the note (status: null)', async () => {
      renderSection(makeDividend({ id: 'd7', receiptStatus: 'not_received' }));
      expect(screen.getByTestId('select')).toHaveAttribute('data-value', 'not_received');
      fireEvent.click(screen.getByRole('option', { name: 'Derived automatically' }));
      await waitFor(() =>
        expect(api.PUT).toHaveBeenCalledWith(STATUS, { params: { path: { id: 'd7' } }, body: { status: null } }),
      );
    });

    it('reflects received_untracked as the current value', () => {
      renderSection(makeDividend({ receiptStatus: 'received_untracked' }));
      expect(screen.getByTestId('select')).toHaveAttribute('data-value', 'received_untracked');
    });

    it('is disabled with helper text when linked', () => {
      renderSection(makeDividend({ receiptStatus: 'received', transaction: linkedTxn }));
      expect(screen.getByTestId('select')).toHaveAttribute('data-disabled', 'true');
      expect(screen.getByText('Unlink to change')).toBeInTheDocument();
    });

    it('has no helper text when unlinked, and reports status failures', async () => {
      vi.mocked(api.PUT).mockRejectedValue(new Error('rejected'));
      renderSection(makeDividend());
      expect(screen.queryByText('Unlink to change')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('option', { name: 'Not received (chasing)' }));
      await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.any(Error), 'Failed to update receipt note'));
    });
  });

  describe('TDS hint', () => {
    const linked = (signedAmount: number) =>
      makeDividend({ amount: 1000, receiptStatus: 'received', transaction: { ...linkedTxn, signedAmount } });

    it('appears when linked, TDS empty and the credit is short by up to 25%; applies the gap', () => {
      const { onUseTds } = renderSection(linked(900), { amount: '1000', tds: '' });
      expect(screen.getByText(/short of the gross amount/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Use ₹100.00 as TDS' }));
      expect(onUseTds).toHaveBeenCalledWith('100');
    });

    it('rounds the gap to 2 decimals', () => {
      const { onUseTds } = renderSection(linked(899.995), { amount: '1000', tds: '' });
      fireEvent.click(screen.getByRole('button', { name: /Use .* as TDS/ }));
      expect(onUseTds).toHaveBeenCalledWith('100.01');
    });

    it('is shown at exactly 25% and hidden beyond it', () => {
      const a = renderSection(linked(750), { amount: '1000' });
      expect(screen.getByRole('button', { name: /as TDS/ })).toBeInTheDocument();
      a.unmount();
      renderSection(linked(749), { amount: '1000' });
      expect(screen.queryByRole('button', { name: /as TDS/ })).not.toBeInTheDocument();
    });

    it('is hidden when the credit is not short (equal or larger)', () => {
      const a = renderSection(linked(1000), { amount: '1000' });
      expect(screen.queryByRole('button', { name: /as TDS/ })).not.toBeInTheDocument();
      a.unmount();
      renderSection(linked(1100), { amount: '1000' });
      expect(screen.queryByRole('button', { name: /as TDS/ })).not.toBeInTheDocument();
    });

    it('is hidden when the TDS field already has a value', () => {
      renderSection(linked(900), { amount: '1000', tds: '100' });
      expect(screen.queryByRole('button', { name: /as TDS/ })).not.toBeInTheDocument();
    });

    it('is hidden when unlinked', () => {
      renderSection(makeDividend({ amount: 1000 }), { amount: '1000', tds: '' });
      expect(screen.queryByRole('button', { name: /as TDS/ })).not.toBeInTheDocument();
    });

    it('uses the form amount, not the stored one', () => {
      renderSection(linked(900), { amount: '1200', tds: '' }); // gap 300 = 25% of 1200
      fireEvent.click(screen.getByRole('button', { name: 'Use ₹300.00 as TDS' }));
    });
  });
});
