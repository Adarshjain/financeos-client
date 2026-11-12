import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const approve = vi.fn();
vi.mock('./useApproveTransactions', () => ({
  useApproveTransactions: () => ({ approve, isPending: false, summary: null, closeSummary: vi.fn() }),
}));
const loadDuplicateReview = vi.hoisted(() => vi.fn());
vi.mock('../transactionActions', () => ({ loadDuplicateReview }));

import { renderWithQuery } from '@/test/renderWithQuery';

import { ApproveDialog } from './ApproveDialog';

const side = (id: string, description: string, over: Record<string, unknown> = {}) => ({
  id,
  date: '2026-10-10',
  amount: 450,
  description,
  accountName: 'Test Savings',
  source: 'sms_alert',
  ...over,
});

const txns = [
  { id: 'a', reviewReasons: ['DUPLICATE_SUSPECT' as const] },
  { id: 'b', reviewReasons: ['DUPLICATE_SUSPECT' as const] },
];

function page(content: unknown[], number: number, last: boolean) {
  return { success: true, data: { content, number, last, totalElements: 3, totalPages: 2, size: 50 } };
}

beforeEach(() => {
  vi.clearAllMocks();
  loadDuplicateReview.mockImplementation(async (n: number) =>
    n === 0
      ? page([{ transaction: side('x', 'Unrelated one'), twin: side('y', 'Other') }, { transaction: side('a', 'Coffee at the long named cafe near the station'), twin: side('a2', 'Coffee at the long named cafe near the station', { source: 'gmail_statement' }) }], 0, false)
      : page([{ transaction: side('b', 'Fuel') }], 1, true),
  );
});

describe('ApproveDialog: Duplicate evidence', () => {
  it('lists this transaction next to the one it looks like, and says so when there is none, reading pages until all are found', async () => {
    renderWithQuery(<ApproveDialog transactions={txns} open onOpenChange={() => {}} />);
    const list = await screen.findByTestId('duplicate-pairs');
    expect(await within(list).findByText('Fuel')).toBeInTheDocument();
    expect(within(list).getAllByText('Coffee at the long named cafe near the station')).toHaveLength(2);
    expect(within(list).getByText('No matching transaction found')).toBeInTheDocument();
    expect(within(list).queryByText('Unrelated one')).toBeNull();
    expect(loadDuplicateReview).toHaveBeenCalledWith(0, 50);
    expect(loadDuplicateReview).toHaveBeenCalledWith(1, 50);
  });

  it('shows nothing extra when Duplicate is not among the reasons', () => {
    renderWithQuery(<ApproveDialog transactions={[{ id: 'a', reviewReasons: ['DATE_CORRECTED' as const] }]} open onOpenChange={() => {}} />);
    expect(screen.queryByTestId('duplicate-pairs')).toBeNull();
    expect(loadDuplicateReview).not.toHaveBeenCalled();
  });

  it('Approve is still one action with the same call', async () => {
    approve.mockResolvedValue(true);
    renderWithQuery(<ApproveDialog transactions={txns} open onOpenChange={() => {}} />);
    await screen.findByTestId('duplicate-pairs');
    fireEvent.click(screen.getByRole('button', { name: 'Approve 2' }));
    await waitFor(() => expect(approve).toHaveBeenCalledWith(txns, ['DUPLICATE_SUSPECT']));
  });

  it('reveals more pairs ten at a time', async () => {
    loadDuplicateReview.mockResolvedValue(
      page(Array.from({ length: 12 }, (_, i) => ({ transaction: side(`t${i}`, `Row ${i}`), twin: side(`w${i}`, `Twin ${i}`) })), 0, true),
    );
    const many = Array.from({ length: 12 }, (_, i) => ({ id: `t${i}`, reviewReasons: ['DUPLICATE_SUSPECT' as const] }));
    renderWithQuery(<ApproveDialog transactions={many} open onOpenChange={() => {}} />);
    await screen.findByText('Row 9');
    expect(screen.queryByText('Row 11')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show more' }));
    expect(await screen.findByText('Row 11')).toBeInTheDocument();
  });
});
