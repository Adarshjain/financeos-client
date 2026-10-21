import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

vi.mock('@/lib/query/hooks/useAccounts', () => ({
  useAccounts: () => ({ data: [{ id: 'a1', name: 'HDFC Savings' }] }),
}));

import { api } from '@/lib/api/client';
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
  (api.POST as Mock).mockResolvedValue({ data: { content, number: 0, size: 50, totalElements: content.length, totalPages } });

function renderField(props: Partial<React.ComponentProps<typeof TransactionPickerField>> = {}) {
  const onSelect = vi.fn();
  const onClear = vi.fn();
  renderWithQuery(<TransactionPickerField value={null} onSelect={onSelect} onClear={onClear} {...props} />);
  return { onSelect, onClear };
}

const open = () => user.click(screen.getByRole('combobox'));

beforeEach(() => vi.clearAllMocks());

describe('TransactionPickerField', () => {
  it('opens a search list whose rows read date · account · description · amount', async () => {
    respond([txn('t1')]);
    renderField();
    await open();
    expect(await screen.findByRole('option', { name: '13 Sep · HDFC Savings · IMPS from X · ₹2,300' })).toBeInTheDocument();
  });

  it('puts the exact amount first, then the nearest date', async () => {
    respond([txn('far', { amount: -900, description: 'Far' }), txn('exact', { amount: -2300, description: 'Exact' })]);
    renderField({ suggestAmount: 2300 });
    await open();
    await screen.findByRole('option', { name: /Exact/ });
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('Exact');
  });

  it('selects a row and reports the transaction', async () => {
    respond([txn('t1')]);
    const { onSelect } = renderField();
    await open();
    await user.click(await screen.findByRole('option', { name: /IMPS from X/ }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }));
  });

  it('sends the search to the server after a pause', async () => {
    respond([]);
    renderField();
    await open();
    fireEvent.change(await screen.findByPlaceholderText('Search by description or amount'), { target: { value: 'emi' } });
    await waitFor(() => expect((api.POST as Mock).mock.calls.at(-1)?.[1].body.search).toBe('emi'));
  });

  it('applies the type filter and the date window it was given', async () => {
    respond([]);
    renderField({ type: 'DEBIT', suggestDate: '2026-10-05' });
    await open();
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    const filters = (api.POST as Mock).mock.calls[0][1].body.filters;
    expect(filters).toContainEqual({ field: 'type', operator: 'is', value: 'DEBIT' });
    expect(filters).toContainEqual({ field: 'date', operator: 'between', value: { from: '2026-09-05', to: '2026-11-04' } });
  });

  it('says Searching until the first answer is in', async () => {
    (api.POST as Mock).mockReturnValue(new Promise(() => undefined));
    renderField();
    await open();
    expect(screen.getByRole('option', { name: 'Searching…' })).toBeInTheDocument();
    expect(screen.queryByText('No matching transactions')).toBeNull();
  });

  it('hides a row another obligation already claims, and says why when nothing is left', async () => {
    respond([txn('t1', { obligationRefs: [{ kind: 'LOAN' }] })]);
    renderField({ excludeAnyObligationRef: true, ruleHint: 'EMI settlements link money-out (debit) transactions' });
    await open();
    expect(await screen.findByText('No matching transactions')).toBeInTheDocument();
    expect(screen.getByText('EMI settlements link money-out (debit) transactions')).toBeInTheDocument();
  });

  it('notes a row that is already shared with ledger entries', async () => {
    respond([txn('t1', { obligationRefs: [{ kind: 'LENDING' }, { kind: 'LENDING' }] })]);
    renderField();
    await open();
    expect(await screen.findByText('also linked to 2 ledger entries')).toBeInTheDocument();
  });

  it('offers Show more while the server has more pages and asks for the next one', async () => {
    respond([txn('t1')], 2);
    renderField();
    await open();
    await screen.findByRole('option', { name: /IMPS from X/ });
    (api.POST as Mock).mockResolvedValue({
      data: { content: [txn('t2', { description: 'Second page' })], number: 1, size: 50, totalElements: 2, totalPages: 2 },
    });
    await user.click(screen.getByRole('button', { name: 'Show more' }));
    expect(await screen.findByRole('option', { name: /Second page/ })).toBeInTheDocument();
    expect((api.POST as Mock).mock.calls.at(-1)?.[1].params.query.page).toBe(1);
    expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull();
  });

  it('shows the picked transaction in the field and lets you remove it', async () => {
    respond([]);
    const value: PickerSummaryLike = { id: 't1', date: '2026-09-13', accountId: 'a1', description: 'IMPS from X', signedAmount: -2300 };
    const { onClear } = renderField({ value });
    expect(screen.getByRole('combobox')).toHaveTextContent('13 Sep · HDFC Savings · IMPS from X · ₹2,300');
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onClear).toHaveBeenCalled();
  });

  it('does not ask the server or show Remove when disabled', async () => {
    respond([]);
    renderField({ disabled: true, value: { id: 't1', date: '2026-09-13', accountId: 'a1', description: 'X', signedAmount: -1 } });
    expect(screen.queryByRole('button', { name: 'Remove' })).toBeNull();
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(api.POST).not.toHaveBeenCalled();
  });
});
