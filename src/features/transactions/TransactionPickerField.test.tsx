import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/server', () => ({ serverApi: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } }));

vi.mock('@/lib/query/hooks/useAccounts', () => ({
  useAccounts: () => ({ data: [{ id: 'a1', name: 'HDFC Savings', last4: '1234' }] }),
}));

import { serverApi as api } from '@/lib/api/server';
import { renderWithQuery } from '@/test/renderWithQuery';

import type { PickerSummaryLike } from './pickerModel';
import { TransactionPickerField } from './TransactionPickerField';
import type { PickerTransaction } from './useTransactionPicker';

type Mock = ReturnType<typeof vi.fn>;
const user = userEvent.setup({ pointerEventsCheck: 0 });

const txn = (id: string, over: Record<string, unknown> = {}): PickerTransaction =>
  ({
    id,
    accountId: 'a1',
    amount: -2300,
    date: '2026-09-13',
    description: 'IMPS from X',
    links: [],
    obligationRefs: [],
    ...over,
  }) as unknown as PickerTransaction;

const respond = (content: PickerTransaction[], totalPages = 1) =>
  (api.POST as Mock).mockResolvedValue({ data: { content, number: 0, size: 10, totalElements: content.length, totalPages } });

function renderField(props: Partial<React.ComponentProps<typeof TransactionPickerField>> = {}) {
  const onSelect = vi.fn();
  const onClear = vi.fn();
  renderWithQuery(<TransactionPickerField value={null} onSelect={onSelect} onClear={onClear} {...props} />);
  return { onSelect, onClear };
}

beforeEach(() => vi.clearAllMocks());

describe('TransactionPickerField', () => {
  it('is an open list whose rows read description, date · account, amount', async () => {
    respond([txn('t1')]);
    renderField();
    expect(await screen.findByRole('radio', { name: 'IMPS from X' })).toBeInTheDocument();
    expect(screen.getByText('13 Sep · HDFC Savings ••1234')).toBeInTheDocument();
    expect(screen.getByText('₹2,300')).toBeInTheDocument();
  });

  it('puts the exact amount first, then the nearest date', async () => {
    respond([txn('far', { amount: -900, description: 'Far' }), txn('exact', { amount: -2300, description: 'Exact' })]);
    renderField({ suggestAmount: 2300 });
    await screen.findByRole('radio', { name: /Exact/ });
    expect(screen.getAllByRole('radio', { name: /^(Far|Exact)$/ })[0]).toHaveTextContent('Exact');
  });

  it('selects a row and reports the transaction', async () => {
    respond([txn('t1')]);
    const { onSelect } = renderField();
    await user.click(await screen.findByRole('radio', { name: /IMPS from X/ }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }));
  });

  it('sends the search to the server after a pause', async () => {
    respond([]);
    renderField();
    fireEvent.change(await screen.findByPlaceholderText('Search by description or amount'), { target: { value: 'emi' } });
    await waitFor(() => expect((api.POST as Mock).mock.calls.at(-1)?.[1].body.search).toBe('emi'));
  });

  it('applies the type filter and the date window it was given', async () => {
    respond([]);
    renderField({ type: 'DEBIT', suggestDate: '2026-10-05' });
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    const filters = (api.POST as Mock).mock.calls[0][1].body.filters;
    expect(filters).toContainEqual({ field: 'type', operator: 'is', value: 'DEBIT' });
    expect(filters).toContainEqual({ field: 'date', operator: 'between', value: { from: '2026-09-05', to: '2026-11-04' } });
  });

  it('shows loading rows until the first answer is in', async () => {
    (api.POST as Mock).mockReturnValue(new Promise(() => undefined));
    renderField();
    expect(screen.getAllByTestId('picker-skeleton').length).toBeGreaterThan(0);
    expect(screen.queryByText(/No transactions match/)).toBeNull();
  });

  it('hides a row another obligation already claims, and says why when nothing is left', async () => {
    respond([txn('t1', { obligationRefs: [{ kind: 'LOAN' }] })]);
    renderField({ excludeAnyObligationRef: true, ruleHint: 'EMI settlements link money-out (debit) transactions' });
    expect(await screen.findByText('No transactions match. EMI settlements link money-out (debit) transactions')).toBeInTheDocument();
  });

  it('notes a row that is already shared with ledger entries', async () => {
    respond([txn('t1', { obligationRefs: [{ kind: 'LENDING' }, { kind: 'LENDING' }] })]);
    renderField();
    expect(await screen.findByText(/also linked to 2 ledger entries/)).toBeInTheDocument();
  });

  it('pages with the Pager below only, asking the server for the page', async () => {
    (api.POST as Mock).mockResolvedValue({
      data: { content: [txn('t1')], number: 0, size: 10, totalElements: 30, totalPages: 3 },
    });
    renderField();
    await screen.findByRole('radio', { name: /IMPS from X/ });
    expect(screen.getAllByRole('navigation', { name: 'Pagination' })).toHaveLength(1);
    (api.POST as Mock).mockResolvedValue({
      data: { content: [txn('t2', { description: 'Second page' })], number: 1, size: 10, totalElements: 30, totalPages: 3 },
    });
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(await screen.findByRole('radio', { name: /Second page/ })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /IMPS from X/ })).toBeNull();
    expect((api.POST as Mock).mock.calls.at(-1)?.[1].params.query.page).toBe(1);
    expect((api.POST as Mock).mock.calls.at(-1)?.[1].params.query.size).toBe(5);
  });

  it('sends the Debit / Credit filter to the server and returns to the first page', async () => {
    respond([txn('t1')]);
    renderField();
    await screen.findByRole('radio', { name: /IMPS from X/ });
    await user.click(screen.getByRole('radio', { name: 'Debit' }));
    await waitFor(() =>
      expect((api.POST as Mock).mock.calls.at(-1)?.[1].body.filters).toEqual([{ field: 'type', operator: 'is', value: 'DEBIT' }]),
    );
    expect((api.POST as Mock).mock.calls.at(-1)?.[1].params.query.page).toBe(0);
    await user.click(screen.getByRole('radio', { name: 'Credit' }));
    await waitFor(() =>
      expect((api.POST as Mock).mock.calls.at(-1)?.[1].body.filters).toEqual([{ field: 'type', operator: 'is', value: 'CREDIT' }]),
    );
  });

  it('hides the filter when the caller fixes the type, and shows it for type null', async () => {
    respond([txn('t1')]);
    renderField({ direction: 'lent' });
    await screen.findByRole('radio', { name: /IMPS from X/ });
    expect(screen.queryByRole('radio', { name: 'Credit' })).toBeNull();
  });

  it('shows the filter when the type is explicitly open (null)', async () => {
    respond([txn('t1')]);
    renderField({ type: null });
    await screen.findByRole('radio', { name: /IMPS from X/ });
    expect(screen.getByRole('radio', { name: 'Credit' })).toBeInTheDocument();
  });

  it('keeps the picked transaction in the list even when search results do not hold it, and lets you remove it', async () => {
    respond([]);
    const value: PickerSummaryLike = { id: 't1', date: '2026-09-13', accountId: 'a1', description: 'IMPS from X', signedAmount: -2300 };
    const { onClear } = renderField({ value });
    expect(screen.getByRole('radio', { name: 'IMPS from X' })).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onClear).toHaveBeenCalled();
  });

  it('does not ask the server or show Remove when disabled', async () => {
    respond([]);
    renderField({ disabled: true, value: { id: 't1', date: '2026-09-13', accountId: 'a1', description: 'X', signedAmount: -1 } });
    expect(screen.queryByRole('button', { name: 'Remove' })).toBeNull();
    expect(screen.getByRole('radio', { name: 'X' })).toHaveAttribute('aria-disabled', 'true');
    expect(api.POST).not.toHaveBeenCalled();
  });

  it('with a pick in place, still says when a new search finds nothing, with the rule hint', async () => {
    respond([]);
    renderField({
      value: { id: 't1', date: '2026-09-13', accountId: 'a1', description: 'IMPS from X', signedAmount: -2300 },
      ruleHint: 'EMI settlements link money-out (debit) transactions',
    });
    expect(await screen.findByText('No transactions match. EMI settlements link money-out (debit) transactions')).toBeInTheDocument();
  });

  it('with a pick in place, shows a loading cue while the search is pending', () => {
    (api.POST as Mock).mockReturnValue(new Promise(() => undefined));
    renderField({ value: { id: 't1', date: '2026-09-13', accountId: 'a1', description: 'IMPS from X', signedAmount: -2300 } });
    expect(screen.getByTestId('picker-pending')).toBeInTheDocument();
    expect(screen.queryByText(/No transactions match/)).toBeNull();
  });

  it('disabled with no pick shows only the label: no search, no empty copy', () => {
    renderField({ disabled: true });
    expect(screen.getByText('Transaction (optional)')).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByText(/No transactions match/)).toBeNull();
    expect(api.POST).not.toHaveBeenCalled();
  });
});
