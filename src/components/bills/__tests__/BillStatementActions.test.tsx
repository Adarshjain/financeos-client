import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { api } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

import { BillStatementActions } from '../BillStatementActions';

const bill = (over: Record<string, unknown>) => ({
  statementId: 's1', accountName: 'HDFC', status: 'OPEN', paymentDueDate: '2026-10-20', daysUntilDue: 5, ...over,
});
const withBill = (b: unknown) => vi.mocked(api.GET).mockResolvedValue({ data: b } as never);

describe('BillStatementActions', () => {
  beforeEach(() => vi.resetAllMocks());

  it('renders nothing for a bill with no statementId (AWAITING_STATEMENT)', async () => {
    withBill(bill({ statementId: null, status: 'AWAITING_STATEMENT' }));
    const { container } = renderWithQuery(<BillStatementActions statementId="s1" />);
    await waitFor(() => expect(api.GET).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while no statement id is given (nothing loaded)', () => {
    const { container } = renderWithQuery(<BillStatementActions statementId={null} />);
    expect(api.GET).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });

  it('an OPEN bill with a statementId shows Mark as paid and no Undo', async () => {
    withBill(bill({ status: 'OPEN' }));
    renderWithQuery(<BillStatementActions statementId="s1" />);
    expect(await screen.findByRole('button', { name: /mark as paid/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /undo/i })).not.toBeInTheDocument();
  });

  it('a MANUAL paid bill shows Undo and no Mark as paid', async () => {
    withBill(bill({ status: 'PAID', paidSource: 'MANUAL', paidMarkedOn: '2026-10-01' }));
    renderWithQuery(<BillStatementActions statementId="s1" />);
    expect(await screen.findByRole('button', { name: /undo/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mark as paid/i })).not.toBeInTheDocument();
  });

  it('a paid bill settled by a non-MANUAL source offers neither action', async () => {
    withBill(bill({ status: 'PAID', paidSource: 'AUTO' }));
    renderWithQuery(<BillStatementActions statementId="s1" />);
    await screen.findByTestId('bill-statement-actions');
    expect(screen.queryByRole('button', { name: /undo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mark as paid/i })).not.toBeInTheDocument();
  });

  it('a PARTIAL manual bill shows both Mark as paid and Undo', async () => {
    withBill(bill({ status: 'PARTIAL', paidSource: 'MANUAL', paidAmount: 100 }));
    renderWithQuery(<BillStatementActions statementId="s1" />);
    expect(await screen.findByRole('button', { name: /undo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mark as paid/i })).toBeInTheDocument();
  });

  it('DUE_UNKNOWN hides Mark as paid', async () => {
    withBill(bill({ status: 'DUE_UNKNOWN' }));
    renderWithQuery(<BillStatementActions statementId="s1" />);
    await screen.findByTestId('bill-statement-actions');
    expect(screen.queryByRole('button', { name: /mark as paid/i })).not.toBeInTheDocument();
  });
});
