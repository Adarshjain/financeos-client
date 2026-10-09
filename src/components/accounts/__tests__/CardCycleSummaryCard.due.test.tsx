import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { api } from '@/lib/api/client';
import type { CardCycleSummary } from '@/lib/statement.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { CardCycleSummaryCard } from '../statements-dialog/CardCycleSummaryCard';

/** The card summary is a bare date difference: five days past the due date. */
const summary = (over: Partial<CardCycleSummary> = {}): CardCycleSummary =>
  ({
    statementId: 's1',
    periodStart: '2026-09-01',
    periodEnd: '2026-09-30',
    totalAmountDue: 5000,
    minimumAmountDue: 500,
    paymentDueDate: '2026-10-04',
    daysUntilDue: -5,
    history: [],
    ...over,
  }) as CardCycleSummary;

const bill = (over: Record<string, unknown>) => ({
  statementId: 's1',
  accountId: 'a1',
  accountName: 'HDFC',
  paymentDueDate: '2026-10-04',
  totalAmountDue: 5000,
  paidAmount: 0,
  paidSource: 'NONE',
  status: 'OVERDUE',
  daysUntilDue: -5,
  ...over,
});

const billGet = (impl: () => Promise<unknown>) =>
  vi.mocked(api.GET).mockImplementation(((url: string) =>
    url === '/api/v1/bills/{statementId}' ? impl() : Promise.resolve({ data: undefined })) as typeof api.GET);

const renderCard = (s: CardCycleSummary = summary()) =>
  renderWithQuery(
    <CardCycleSummaryCard cardSummary={s} isLoadingCardSummary={false} cardSummaryError={null} onRetry={vi.fn()} />,
  );

describe('CardCycleSummaryCard due badge', () => {
  beforeEach(() => vi.resetAllMocks());

  it('a manually paid bill past its due date shows Paid and no overdue count', async () => {
    billGet(() => Promise.resolve({ data: bill({ status: 'PAID', paidSource: 'MANUAL', paidAmount: 5000, paidMarkedOn: '2026-10-08' }) }));
    renderCard();
    expect(await screen.findByTestId('bill-status')).toHaveTextContent('Paid');
    expect(screen.queryByTestId('cycle-due-badge')).not.toBeInTheDocument();
    expect(screen.queryByText(/overdue/i)).not.toBeInTheDocument();
  });

  it('a bill settled by a linked payment past its due date shows no overdue count', async () => {
    billGet(() => Promise.resolve({ data: bill({ status: 'PAID', paidSource: 'LINK', paidAmount: 5000 }) }));
    renderCard();
    expect(await screen.findByTestId('bill-status')).toHaveTextContent('Paid');
    expect(screen.queryByText(/days overdue/i)).not.toBeInTheDocument();
  });

  it('a bill with nothing due shows no countdown', async () => {
    billGet(() => Promise.resolve({ data: bill({ status: 'NO_DUE', totalAmountDue: 0 }) }));
    renderCard();
    expect(await screen.findByTestId('bill-status')).toHaveTextContent('Nothing due');
    expect(screen.queryByTestId('cycle-due-badge')).not.toBeInTheDocument();
  });

  it('an unpaid bill past its due date still shows the overdue count', async () => {
    billGet(() => Promise.resolve({ data: bill({}) }));
    renderCard();
    expect(await screen.findByText('5 days overdue')).toBeInTheDocument();
  });

  it('a partly paid bill past its due date still shows the overdue count', async () => {
    billGet(() => Promise.resolve({ data: bill({ paidSource: 'MANUAL', paidAmount: 1000 }) }));
    renderCard();
    expect(await screen.findByText('5 days overdue')).toBeInTheDocument();
  });

  it('an open bill counts down with the bill days', async () => {
    billGet(() => Promise.resolve({ data: bill({ status: 'OPEN', daysUntilDue: 4 }) }));
    renderCard(summary({ daysUntilDue: 4 }));
    expect(await screen.findByText('Due in 4 days')).toBeInTheDocument();
  });

  it('an open bill due today says so', async () => {
    billGet(() => Promise.resolve({ data: bill({ status: 'OPEN', daysUntilDue: 0 }) }));
    renderCard(summary({ daysUntilDue: 0 }));
    expect(await screen.findByText('Due today')).toBeInTheDocument();
  });

  it('shows no countdown while the bill is loading', async () => {
    billGet(() => new Promise(() => {}));
    renderCard();
    await waitFor(() => expect(api.GET).toHaveBeenCalled());
    expect(screen.getByText('Total Amount Due')).toBeInTheDocument();
    expect(screen.queryByTestId('cycle-due-badge')).not.toBeInTheDocument();
  });

  it('shows no countdown when the bill fails to load', async () => {
    billGet(() => Promise.reject(new Error('boom')));
    renderCard();
    await waitFor(() => expect(api.GET).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId('cycle-due-badge')).not.toBeInTheDocument();
  });

  it('falls back to the summary days when the statement has no bill', async () => {
    billGet(() => Promise.resolve({ data: undefined }));
    renderCard(summary({ daysUntilDue: 10 }));
    expect(await screen.findByText('Due in 10 days')).toBeInTheDocument();
  });

  it('marking an overdue bill paid clears the overdue count in place', async () => {
    let current = bill({});
    billGet(() => Promise.resolve({ data: current }));
    vi.mocked(api.POST).mockImplementation((async () => {
      current = bill({ status: 'PAID', paidSource: 'MANUAL', paidAmount: 5000, paidMarkedOn: '2026-10-09' });
      return { data: current };
    }) as never);
    renderCard();

    expect(await screen.findByText('5 days overdue')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /mark as paid/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mark as paid' }));

    await waitFor(() => expect(screen.getByTestId('bill-status')).toHaveTextContent('Paid'));
    expect(screen.queryByText(/days overdue/i)).not.toBeInTheDocument();
    expect(api.POST).toHaveBeenCalledWith('/api/v1/bills/{statementId}/mark-paid', expect.objectContaining({ params: { path: { statementId: 's1' } } }));
  });
});
