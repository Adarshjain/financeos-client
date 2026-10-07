import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/query/hooks/useInvestments', () => ({
  usePositions: () => ({
    isLoading: false,
    data: [
      {
        holdingId: 'h1',
        brokerAccountId: 'b1',
        brokerName: 'Zerodha',
        instrument: { id: 'i1', name: 'Infosys', symbol: 'INFY' },
      },
    ],
  }),
}));

import { TransactionLinkDialog } from '@/components/transactions/TransactionLinkDialog';
import type { Account } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import type { Transaction } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

type Mock = ReturnType<typeof vi.fn>;

const accounts: Account[] = [{ id: 'acc1', name: 'HDFC Savings', type: AccountType.BANK_ACCOUNT }];
const credit: Transaction = {
  id: 't1',
  accountId: 'acc1',
  date: '2026-07-10',
  amount: 900,
  description: 'ACH credit INFY',
  sourcedDescription: 'ACH CREDIT INFY',
  source: 'manual',
  reviewType: 'MANUALLY_REVIEWED',
  createdAt: '2026-07-10T00:00:00Z',
};

const row = (o: Record<string, unknown>) => ({
  symbol: 'INFY',
  instrumentName: 'Infosys',
  brokerName: 'Zerodha',
  amount: 1000,
  payDate: '2026-07-01',
  receiptStatus: 'awaiting',
  ...o,
});

function mockDividends(byReceipt: Record<string, unknown[]>) {
  (api.GET as Mock).mockImplementation((path: string, opts?: { params?: { query?: { receipt?: string } } }) => {
    if (path === '/api/v1/investments/dividends') {
      return Promise.resolve({ data: { content: byReceipt[opts?.params?.query?.receipt ?? ''] ?? [] } });
    }
    return Promise.resolve({ data: null });
  });
}

function renderDialog(txn: Transaction = credit, onSuccess = vi.fn()) {
  renderWithQuery(
    <TransactionLinkDialog
      initialTransaction={txn}
      accounts={accounts}
      open
      onOpenChange={vi.fn()}
      onSuccess={onSuccess}
    />,
  );
  return { onSuccess };
}

async function pickDividendKind() {
  fireEvent.click(screen.getAllByRole('combobox')[0]);
  fireEvent.click(await screen.findByText('Dividend received'));
}

describe('TransactionLinkDialog DIVIDEND kind', () => {
  beforeEach(() => vi.clearAllMocks());

  it('routes to the dividend body with the "Link dividend" primary label, disabled until a row is available', async () => {
    mockDividends({});
    renderDialog();
    await pickDividendKind();

    expect(await screen.findByText('No unmatched dividends. Record a new one instead.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Link dividend' })).toBeDisabled();
  });

  it('lists unresolved rows with status badge and expected net, preselects the best match and links on submit', async () => {
    mockDividends({
      awaiting: [row({ id: 'd1', amount: 1000, payDate: '2026-07-01' })],
      overdue: [row({ id: 'd2', symbol: 'TCS', instrumentName: 'Tata', amount: 5000, tds: 500, receiptStatus: 'overdue' })],
    });
    (api.PUT as Mock).mockResolvedValue({ data: {} });
    const { onSuccess } = renderDialog();
    await pickDividendKind();

    const radios = await screen.findAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(screen.getByText('awaiting')).toBeInTheDocument();
    expect(screen.getByText('overdue')).toBeInTheDocument();
    // d1 (1000, 10% TDS => 900) is the 0.9 match for a 900 credit.
    const d1 = screen.getByRole('radio', { name: /INFY/ });
    expect(d1).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText(/Record TDS of/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Link dividend' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/investments/dividends/{id}/transaction', {
      params: { path: { id: 'd1' } },
      body: { transactionId: 't1', updateTds: true },
    });
  });

  it('switches to new mode: label becomes "Record & link" and creates then links', async () => {
    mockDividends({});
    (api.POST as Mock).mockResolvedValue({ data: { id: 'n1' } });
    (api.PUT as Mock).mockResolvedValue({ data: {} });
    const { onSuccess } = renderDialog();
    await pickDividendKind();

    fireEvent.click(await screen.findByRole('button', { name: 'New dividend' }));
    expect(screen.getByRole('button', { name: 'Record & link' })).toBeDisabled();

    fireEvent.click(screen.getByRole('combobox', { name: 'Holding' }));
    fireEvent.click(await screen.findByText('INFY · Zerodha'));
    const submit = screen.getByRole('button', { name: 'Record & link' });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(api.POST).toHaveBeenCalledWith(
      '/api/v1/investments/dividends',
      expect.objectContaining({
        body: expect.objectContaining({ brokerAccountId: 'b1', instrumentId: 'i1', amount: 900 }),
      }),
    );
    expect(api.PUT).toHaveBeenCalledWith(
      '/api/v1/investments/dividends/{id}/transaction',
      expect.objectContaining({ params: { path: { id: 'n1' } } }),
    );
  });

  it('disables the Dividend kind for a debit transaction', async () => {
    mockDividends({});
    renderDialog({ ...credit, amount: -900 });
    expect(
      screen.getByText('Dividend received: Dividends must be money-in (credit) transactions'),
    ).toBeInTheDocument();
  });
});
