import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
const showToast = vi.hoisted(() => vi.fn());
vi.mock('@/components/ds/Toast/Toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => showToast(...args),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock('@/lib/date-range', () => ({ todayInAppZone: () => '2026-10-08' }));

import { api } from '@/lib/api/client';
import type { CardBillResponse } from '@/lib/api/types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { InboxBillHost } from './InboxBillHost';

const bill = {
  statementId: 's1',
  accountId: 'a1',
  accountName: 'Amex Platinum Travel',
  last4: '1008',
  status: 'OPEN',
  paidSource: 'NONE',
  missingDetails: [],
  muted: false,
  periodEnd: '2026-10-03',
  paymentDueDate: '2026-10-15',
  totalAmountDue: 33900,
  minimumAmountDue: 1700,
  remainingAmount: 23900,
} as CardBillResponse;

describe('InboxBillHost', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.GET).mockResolvedValue({ data: bill } as never);
  });

  it('renders nothing open until a bill action is pending', () => {
    renderWithQuery(<InboxBillHost pending={null} onClose={vi.fn()} />);
    expect(screen.queryByText('Mark bill as paid')).not.toBeInTheDocument();
    expect(screen.queryByText('Set statement details')).not.toBeInTheDocument();
    expect(api.GET).not.toHaveBeenCalled();
  });

  it('mark paid opens with the loaded bill and records a full payment', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: { ...bill, status: 'PAID' } } as never);
    const onClose = vi.fn();
    renderWithQuery(<InboxBillHost pending={{ type: 'mark_paid', statementId: 's1' }} onClose={onClose} />);
    expect(await screen.findByText('Mark bill as paid')).toBeInTheDocument();
    expect(screen.getByText(/Amex Platinum Travel ••1008 · .*23,900 outstanding/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mark paid' }));
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith('/api/v1/bills/{statementId}/mark-paid', {
        params: { path: { statementId: 's1' } },
        body: { paidOn: '2026-10-08' },
      }),
    );
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Bill marked as paid', expect.anything()));
  });

  it('set details opens with the statement values and saves the changed ones', async () => {
    vi.mocked(api.PATCH).mockResolvedValue({ data: bill } as never);
    renderWithQuery(<InboxBillHost pending={{ type: 'set_details', statementId: 's1' }} onClose={vi.fn()} />);
    expect(await screen.findByText('Set statement details')).toBeInTheDocument();
    expect(screen.getByText('Amex Platinum Travel ••1008 · statement of 3 Oct')).toBeInTheDocument();
    expect(screen.getByLabelText('Total due (₹)')).toHaveValue('33900');
    expect(screen.getByLabelText(/Minimum due/)).toHaveValue('1700');
    expect(screen.getByLabelText('Due date')).toHaveValue('15/10/2026');
    fireEvent.change(screen.getByLabelText('Total due (₹)'), { target: { value: '34000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(api.PATCH).toHaveBeenCalledWith('/api/v1/bills/{statementId}/details', {
        params: { path: { statementId: 's1' } },
        body: { totalAmountDue: 34000 },
      }),
    );
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Statement details saved'));
  });

  it('a bill that cannot be loaded toasts and closes', async () => {
    vi.mocked(api.GET).mockRejectedValue(new Error('gone'));
    const onClose = vi.fn();
    renderWithQuery(<InboxBillHost pending={{ type: 'mark_paid', statementId: 's1' }} onClose={onClose} />);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(showToast).toHaveBeenCalledWith(expect.any(String), { tone: 'danger' });
  });
});
