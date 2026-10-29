import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithQuery } from '@/test/renderWithQuery';

import { DividendAddDialog, DividendEditDialog } from './DividendFormDialog';
import { awaiting, dividend } from './dividends.fixtures';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ unstable_rethrow: () => undefined, useRouter: () => router }));

const showToast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => showToast(...args),
}));

vi.mock('@/lib/date-range', () => ({ todayInAppZone: () => '2026-10-13' }));

const options = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('./dividendsActions', async (orig) => ({ ...(await orig<typeof import('./dividendsActions')>()), loadDividendFormOptions: options.load }));

const http = vi.hoisted(() => ({ POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ serverApi: http }));

// The picker has its own tests; here it can pick a credit.
vi.mock('@/features/transactions/TransactionPickerField', () => ({
  TransactionPickerField: (p: { suggestAmount?: number | null; onSelect: (t: unknown) => void; type?: string; shareableKind?: string }) => (
    <div data-testid="picker" data-type={p.type} data-kind={p.shareableKind} data-amount={p.suggestAmount}>
      <button type="button" onClick={() => p.onSelect({ id: 'tx9' })}>
        Pick credit
      </button>
    </div>
  ),
}));

const ok = (data: unknown = {}) => Promise.resolve({ data });

beforeEach(() => {
  vi.clearAllMocks();
  options.load.mockResolvedValue({
    success: true,
    data: {
      brokers: [{ id: 'b1', name: 'Zerodha' }],
      positions: [{ holdingId: 'h1', brokerAccountId: 'b1', brokerName: 'Zerodha', provider: 'Zerodha', instrument: { id: 'i1', type: 'stock', name: 'HDFC Bank Ltd', symbol: 'HDFCBANK' } }],
    },
  });
  http.POST.mockReturnValue(ok({ id: 'new1' }));
  http.PUT.mockReturnValue(ok({}));
  http.DELETE.mockReturnValue(ok());
});

const field = (name: string) => screen.getByLabelText(new RegExp(`^${name}`)) as HTMLInputElement;

describe('DividendAddDialog', () => {
  it('shows the form once the accounts and holdings arrive, with today as the pay date', async () => {
    renderWithQuery(<DividendAddDialog onClose={vi.fn()} />);
    expect(await screen.findByRole('button', { name: 'Record dividend' })).toBeInTheDocument();
    expect(field('Pay date')).toHaveValue('13/10/2026');
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  });

  it('says what is missing and records nothing', async () => {
    renderWithQuery(<DividendAddDialog onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Record dividend' }));
    expect(await screen.findByText('Choose a held instrument.')).toBeInTheDocument();
    expect(screen.getByText('Enter an amount above zero.')).toBeInTheDocument();
    expect(http.POST).not.toHaveBeenCalled();
  });

  it('records the dividend with the amounts rounded, then refreshes and closes', async () => {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    renderWithQuery(<DividendAddDialog prefill={{ instrumentId: 'i1' }} onClose={onClose} onSaved={onSaved} />);
    await screen.findByRole('button', { name: 'Record dividend' });
    fireEvent.change(field('Amount'), { target: { value: '880' } });
    fireEvent.change(field('TDS'), { target: { value: '88' } });
    fireEvent.change(field('Per unit'), { target: { value: '22' } });
    fireEvent.change(field('Notes'), { target: { value: ' final ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record dividend' }));
    await waitFor(() =>
      expect(http.POST).toHaveBeenCalledWith('/api/v1/investments/dividends', {
        body: { type: 'dividend', amount: 880, perUnit: 22, tds: 88, exDate: undefined, payDate: '2026-10-13', notes: 'final', brokerAccountId: 'b1', instrumentId: 'i1' },
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(showToast).toHaveBeenCalledWith('Dividend recorded');
    expect(router.refresh).toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalled();
  });

  it('fills the amount and date from a bank credit and links it after recording', async () => {
    renderWithQuery(
      <DividendAddDialog prefill={{ instrumentId: 'i1', brokerAccountId: 'b1', amount: 500, payDate: '2026-09-24', linkTransactionId: 'tx1' }} onClose={vi.fn()} />,
    );
    await screen.findByRole('button', { name: 'Record dividend' });
    expect(field('Amount')).toHaveValue('500');
    expect(field('Pay date')).toHaveValue('24/09/2026');
    fireEvent.click(screen.getByRole('button', { name: 'Record dividend' }));
    await waitFor(() =>
      expect(http.PUT).toHaveBeenCalledWith('/api/v1/investments/dividends/{id}/transaction', {
        params: { path: { id: 'new1' } },
        body: { transactionId: 'tx1', updateTds: false },
      }),
    );
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Dividend recorded and linked'));
  });

  it('keeps the recorded dividend and says so when only the link failed', async () => {
    http.PUT.mockRejectedValue(new Error('no'));
    const onClose = vi.fn();
    renderWithQuery(<DividendAddDialog prefill={{ instrumentId: 'i1', amount: 500, linkTransactionId: 'tx1' }} onClose={onClose} />);
    await screen.findByRole('button', { name: 'Record dividend' });
    fireEvent.click(screen.getByRole('button', { name: 'Record dividend' }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.stringContaining('link the bank credit'), { tone: 'danger' }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Dividend recorded'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows an error when the form options cannot be loaded', async () => {
    options.load.mockResolvedValue({ success: false, error: { message: 'down' } });
    renderWithQuery(<DividendAddDialog onClose={vi.fn()} />);
    expect(await screen.findByText(/Couldn't load/)).toBeInTheDocument();
  });
});

describe('DividendEditDialog', () => {
  it('shows the payout with its account fixed and Delete beside Cancel', () => {
    renderWithQuery(<DividendEditDialog dividend={dividend()} onClose={vi.fn()} />);
    expect(screen.getByText('Edit dividend')).toBeInTheDocument();
    expect(screen.getByText('HDFCBANK · Zerodha')).toBeInTheDocument();
    expect(field('Account')).toBeDisabled();
    expect(field('Amount')).toHaveValue('880');
    expect(field('TDS')).toHaveValue('88');
    expect(field('Ex-date')).toHaveValue('10/07/2026');
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('saves the changes to the one dividend', async () => {
    const onClose = vi.fn();
    renderWithQuery(<DividendEditDialog dividend={dividend()} onClose={onClose} />);
    fireEvent.change(field('Amount'), { target: { value: '900' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save dividend' }));
    await waitFor(() =>
      expect(http.PUT).toHaveBeenCalledWith('/api/v1/investments/dividends/{id}', {
        params: { path: { id: 'd1' } },
        body: { type: 'dividend', amount: 900, perUnit: 22, tds: 88, exDate: '2026-07-10', payDate: '2026-07-11', notes: undefined },
      }),
    );
    expect(showToast).toHaveBeenCalledWith('Dividend updated');
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('asks before deleting, and keeps the dividend on Cancel', async () => {
    renderWithQuery(<DividendEditDialog dividend={dividend()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Delete HDFCBANK · ₹792?')).toBeInTheDocument();
    expect(screen.getByText(/stays in your transactions, unlinked/)).toBeInTheDocument();
    expect(http.DELETE).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel' }).at(-1)!);
    await waitFor(() => expect(screen.queryByText('Delete HDFCBANK · ₹792?')).toBeNull());
    expect(http.DELETE).not.toHaveBeenCalled();
  });

  it('deletes after the confirmation, then refreshes and closes', async () => {
    const onClose = vi.fn();
    renderWithQuery(<DividendEditDialog dividend={dividend()} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete dividend' }));
    await waitFor(() => expect(http.DELETE).toHaveBeenCalledWith('/api/v1/investments/dividends/{id}', { params: { path: { id: 'd1' } } }));
    expect(showToast).toHaveBeenCalledWith('Dividend deleted');
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  describe('receipt', () => {
    it('shows the linked credit, and Unlink removes it at once', async () => {
      renderWithQuery(<DividendEditDialog dividend={dividend()} onClose={vi.fn()} />);
      expect(screen.getByText('ACH CR · HDFC BANK DIV')).toBeInTheDocument();
      expect(screen.getByText('11 Jul · HDFC Savings · +₹792')).toBeInTheDocument();
      expect(screen.getByText('Received')).toBeInTheDocument();
      expect(screen.getByText(/Unlink to change it/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Unlink' }));
      await waitFor(() => expect(http.DELETE).toHaveBeenCalledWith('/api/v1/investments/dividends/{id}/transaction', { params: { path: { id: 'd1' } } }));
      expect(showToast).toHaveBeenCalledWith('Unlinked');
    });

    it('offers money-in credits to link when none is linked, and links the one picked', async () => {
      renderWithQuery(<DividendEditDialog dividend={awaiting()} onClose={vi.fn()} />);
      const picker = screen.getByTestId('picker');
      expect(picker).toHaveAttribute('data-type', 'CREDIT');
      expect(picker).toHaveAttribute('data-kind', 'DIVIDEND');
      expect(picker).toHaveAttribute('data-amount', '110');
      fireEvent.click(screen.getByRole('button', { name: 'Pick credit' }));
      await waitFor(() =>
        expect(http.PUT).toHaveBeenCalledWith('/api/v1/investments/dividends/{id}/transaction', {
          params: { path: { id: 'd2' } },
          body: { transactionId: 'tx9', updateTds: false },
        }),
      );
      expect(showToast).toHaveBeenCalledWith('Linked');
    });

    it('offers the TDS the credit is short by, and fills the field with it', () => {
      const d = dividend({ tds: undefined, amount: 1000, transaction: { ...dividend().transaction!, signedAmount: 900 } });
      renderWithQuery(<DividendEditDialog dividend={d} onClose={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Use ₹100 as TDS' }));
      expect(field('TDS')).toHaveValue('100');
    });

    it('says how far the credit is from the expected net', () => {
      renderWithQuery(<DividendEditDialog dividend={dividend({ tds: 0 })} onClose={vi.fn()} />);
      expect(screen.getByText('±₹88 vs expected')).toBeInTheDocument();
    });

    it('can mark an unlinked payout as not received, and the note is locked while linked', async () => {
      const { unmount } = renderWithQuery(<DividendEditDialog dividend={awaiting()} onClose={vi.fn()} />);
      fireEvent.click(screen.getByRole('combobox', { name: /Receipt note/ }));
      fireEvent.click(await screen.findByRole('option', { name: 'Not received' }));
      await waitFor(() =>
        expect(http.PUT).toHaveBeenCalledWith('/api/v1/investments/dividends/{id}/receipt-status', {
          params: { path: { id: 'd2' } },
          body: { status: 'not_received' },
        }),
      );
      expect(showToast).toHaveBeenCalledWith('Receipt note updated');
      unmount();
      renderWithQuery(<DividendEditDialog dividend={dividend()} onClose={vi.fn()} />);
      expect(screen.getByRole('combobox', { name: /Receipt note/ })).toBeDisabled();
    });
  });
});
