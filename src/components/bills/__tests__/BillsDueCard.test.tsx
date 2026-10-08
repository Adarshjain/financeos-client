import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api/client';
import type { CardBillResponse } from '@/lib/api/types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { BillsDueCard } from '../BillsDueCard';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

const searchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function bill(overrides: Partial<CardBillResponse>): CardBillResponse {
  return {
    accountId: 'acc-1',
    accountName: 'HDFC Regalia',
    last4: '4321',
    statementId: 'stmt-1',
    periodStart: '2026-09-11',
    periodEnd: '2026-10-10',
    paymentDueDate: '2026-10-28',
    totalAmountDue: 48250,
    minimumAmountDue: 2500,
    paidAmount: 0,
    remainingAmount: 48250,
    paidSource: 'NONE',
    status: 'OPEN',
    daysUntilDue: 8,
    paidMarkedOn: null,
    possiblePayments: [],
    muted: false,
    statementCreatedAt: '2026-10-11T04:00:00Z',
    lastNotifiedKind: null,
    lastNotifiedOn: null,
    digest: null,
    ...overrides,
  } as CardBillResponse;
}

describe('BillsDueCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams.delete('bill');
  });

  it('renders nothing when there are no bills', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: [] } as never);
    const { container } = renderWithQuery(<BillsDueCard />);
    await waitFor(() => expect(api.GET).toHaveBeenCalledWith('/api/v1/bills'));
    await waitFor(() => expect(container.querySelector('[data-testid="bills-due-card"]')).toBeNull());
  });

  it('shows each bill with its status, amount and actions from server-provided data', () => {
    renderWithQuery(
      <BillsDueCard
        initialBills={[
          bill({ status: 'OVERDUE', daysUntilDue: -2, statementId: 'overdue' }),
          bill({ status: 'PAID', paidSource: 'MANUAL', paidMarkedOn: '2026-10-12', remainingAmount: 0, statementId: 'paid', accountName: 'Axis' }),
          bill({ status: 'DUE_UNKNOWN', paymentDueDate: null, totalAmountDue: null, remainingAmount: null, daysUntilDue: null, statementId: 'unknown', accountName: 'ICICI' }),
        ]}
      />,
    );
    const rows = screen.getAllByTestId('bill-row');
    expect(rows).toHaveLength(3);
    expect(screen.getByText('Bills due')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();

    expect(within(rows[0]).getByText('Overdue by 2 days', { exact: false })).toBeInTheDocument();
    expect(within(rows[0]).getByRole('button', { name: /mark as paid/i })).toBeInTheDocument();
    expect(within(rows[0]).getByText('₹48,250.00')).toBeInTheDocument();

    expect(within(rows[1]).getByText('Paid', { selector: '[data-testid="bill-status"]' })).toBeInTheDocument();
    expect(within(rows[1]).getByRole('button', { name: /undo/i })).toBeInTheDocument();
    expect(within(rows[1]).queryByRole('button', { name: /mark as paid/i })).toBeNull();

    expect(within(rows[2]).getByRole('button', { name: /set due date/i })).toBeInTheDocument();
    expect(within(rows[2]).getByText('Set the due date to start reminders')).toBeInTheDocument();
  });

  it('marks a bill paid in full through the dialog', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: bill({ status: 'PAID', paidSource: 'MANUAL', remainingAmount: 0 }) } as never);
    vi.mocked(api.GET).mockResolvedValue({ data: [bill({ status: 'PAID', paidSource: 'MANUAL' })] } as never);
    renderWithQuery(<BillsDueCard initialBills={[bill({})]} />);

    fireEvent.click(screen.getByRole('button', { name: /mark as paid/i }));
    expect(await screen.findByText('Mark bill as paid')).toBeInTheDocument();
    expect(screen.getByText('HDFC Regalia ••4321 · ₹48,250.00 outstanding')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mark as paid' }));

    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith(
        '/api/v1/bills/{statementId}/mark-paid',
        expect.objectContaining({ params: { path: { statementId: 'stmt-1' } }, body: expect.objectContaining({ paidOn: expect.any(String) }) }),
      ),
    );
    const body = vi.mocked(api.POST).mock.calls[0][1] as { body: { amount?: number } };
    expect(body.body.amount).toBeUndefined();
  });

  it('records a partial amount and validates it', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: bill({ status: 'PARTIAL', paidAmount: 5000, remainingAmount: 43250, paidSource: 'MANUAL' }) } as never);
    renderWithQuery(<BillsDueCard initialBills={[bill({})]} />);

    fireEvent.click(screen.getByRole('button', { name: /mark as paid/i }));
    await screen.findByText('Mark bill as paid');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Paid in full' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mark as paid' }));
    expect(await screen.findByText('Enter the amount you paid')).toBeInTheDocument();
    expect(api.POST).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Amount paid (₹)'), { target: { value: '5000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mark as paid' }));
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith(
        '/api/v1/bills/{statementId}/mark-paid',
        expect.objectContaining({ body: expect.objectContaining({ amount: 5000 }) }),
      ),
    );
  });

  it('confirms a possible payment with its amount and date prefilled', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: bill({ status: 'PAID' }) } as never);
    renderWithQuery(
      <BillsDueCard
        initialBills={[
          bill({ possiblePayments: [{ transactionId: 't1', date: '2026-10-01', amount: 20000, description: 'UPI' }] }),
        ]}
      />,
    );
    expect(screen.getByText(/Looks like a payment: ₹20,000\.00 on 1 Oct/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await screen.findByText('Mark bill as paid');
    expect(screen.getByRole('checkbox', { name: 'Paid in full' })).toHaveAttribute('data-state', 'unchecked');
    expect(screen.getByLabelText('Amount paid (₹)')).toHaveValue('20000');
    expect(screen.getByLabelText('Paid on')).toHaveValue('01/10/2026');

    fireEvent.click(screen.getByRole('button', { name: 'Mark as paid' }));
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith(
        '/api/v1/bills/{statementId}/mark-paid',
        expect.objectContaining({ body: { amount: 20000, paidOn: '2026-10-01' } }),
      ),
    );
  });

  it('undoes a manual mark and saves missing statement details', async () => {
    const bills = [
      bill({ status: 'PAID', paidSource: 'MANUAL', statementId: 'paid' }),
      bill({ status: 'DUE_UNKNOWN', paymentDueDate: null, totalAmountDue: null, daysUntilDue: null, statementId: 'unknown' }),
    ];
    vi.mocked(api.DELETE).mockResolvedValue({ data: bill({ statementId: 'paid' }) } as never);
    vi.mocked(api.PATCH).mockResolvedValue({ data: bill({ statementId: 'unknown' }) } as never);
    // Mutations invalidate the list; the refetch must keep both rows on screen.
    vi.mocked(api.GET).mockResolvedValue({ data: bills } as never);
    renderWithQuery(<BillsDueCard initialBills={bills} />);
    fireEvent.click(screen.getByRole('button', { name: /undo/i }));
    await waitFor(() =>
      expect(api.DELETE).toHaveBeenCalledWith('/api/v1/bills/{statementId}/mark-paid', { params: { path: { statementId: 'paid' } } }),
    );

    fireEvent.click(screen.getByRole('button', { name: /set due date/i }));
    await screen.findByText('Statement details');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Change at least one of the fields')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Payment due date'), { target: { value: '28/10/2026' } });
    fireEvent.change(screen.getByLabelText('Total amount due (₹)'), { target: { value: '12000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(api.PATCH).toHaveBeenCalledWith(
        '/api/v1/bills/{statementId}/details',
        expect.objectContaining({ params: { path: { statementId: 'unknown' } }, body: { paymentDueDate: '2026-10-28', totalAmountDue: 12000 } }),
      ),
    );
  });

  it('highlights the bill named in the deep link', () => {
    searchParams.set('bill', 'stmt-2');
    renderWithQuery(<BillsDueCard initialBills={[bill({ statementId: 'stmt-1' }), bill({ statementId: 'stmt-2', accountName: 'Axis' })]} />);
    const rows = screen.getAllByTestId('bill-row');
    expect(rows[1].className).toContain('ring-emerald');
    expect(rows[0].className).not.toContain('ring-emerald');
  });
});
