import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithQuery } from '@/test/renderWithQuery';

import { LinkSuggestionsDialog } from './LinkSuggestionsDialog';

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));

const actions = vi.hoisted(() => ({
  loadLinkSuggestions: vi.fn(),
  acceptLinkSuggestion: vi.fn(),
  dismissLinkSuggestion: vi.fn(),
}));
vi.mock('./linkActions', () => actions);

const detail = vi.hoisted(() => ({ deleteTransactionLink: vi.fn() }));
vi.mock('@/features/transactions/detail/transactionDetailApi', () => detail);

const summary = (id: string, description: string, type: 'DEBIT' | 'CREDIT', accountName: string) => ({
  id,
  description,
  type,
  accountName,
  amount: 5000,
  date: '2026-10-12',
});

const suggestion = (id: string, kind: string, tx: string, candidates: string[]) => ({
  id,
  kind,
  transaction: summary(tx, `Out ${tx}`, 'DEBIT', 'HDFC Savings'),
  candidates: candidates.map((c) => summary(c, `In ${c}`, 'CREDIT', 'SBI Savings')),
});

const SUGGESTIONS = [
  suggestion('s1', 'TRANSFER', 't1', ['c1', 'c2']),
  suggestion('s2', 'TRANSFER', 't2', ['c3']),
  suggestion('s3', 'REFUND', 't3', ['c4']),
];

beforeEach(() => {
  vi.clearAllMocks();
  actions.loadLinkSuggestions.mockResolvedValue({ success: true, data: SUGGESTIONS });
  actions.acceptLinkSuggestion.mockResolvedValue({ success: true, data: { id: 'link1' } });
  actions.dismissLinkSuggestion.mockResolvedValue({ success: true, data: undefined });
  detail.deleteTransactionLink.mockResolvedValue(undefined);
});

const open = (onClose = vi.fn()) => {
  renderWithQuery(<LinkSuggestionsDialog kind="TRANSFER" onClose={onClose} />);
  return onClose;
};

describe('LinkSuggestionsDialog', () => {
  it('titles the kind and shows only that kind, first candidate pre-selected', async () => {
    open();
    await screen.findAllByTestId('link-suggestion');
    expect(screen.getByText('Possible transfers')).toBeInTheDocument();
    expect(screen.getAllByTestId('link-suggestion')).toHaveLength(2);
    expect(screen.getByRole('radio', { name: 'In c1' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'In c2' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByText('Out t3')).not.toBeInTheDocument();
  });

  it('Link accepts the chosen candidate, removes the block and toasts Linked with Undo that deletes the link', async () => {
    open();
    await screen.findAllByTestId('link-suggestion');
    fireEvent.click(screen.getByRole('radio', { name: 'In c2' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Link' })[0]);
    await waitFor(() => expect(actions.acceptLinkSuggestion).toHaveBeenCalledWith('s1', 'c2'));
    await waitFor(() => expect(screen.getAllByTestId('link-suggestion')).toHaveLength(1));
    expect(toast).toHaveBeenCalledWith('Linked', expect.objectContaining({ action: expect.objectContaining({ label: 'Undo' }) }));
    (toast.mock.calls[0][1] as { action: { onSelect: () => void } }).action.onSelect();
    await waitFor(() => expect(detail.deleteTransactionLink).toHaveBeenCalledWith('link1'));
  });

  it('Not a match dismisses the suggestion, removes the block and shows no toast', async () => {
    open();
    await screen.findAllByTestId('link-suggestion');
    fireEvent.click(screen.getAllByRole('button', { name: 'Not a match' })[0]);
    await waitFor(() => expect(actions.dismissLinkSuggestion).toHaveBeenCalledWith('s1'));
    await waitFor(() => expect(screen.getAllByTestId('link-suggestion')).toHaveLength(1));
    expect(toast).not.toHaveBeenCalled();
  });

  it('closes when the last block goes', async () => {
    const onClose = open();
    await screen.findAllByTestId('link-suggestion');
    fireEvent.click(screen.getAllByRole('button', { name: 'Not a match' })[0]);
    await waitFor(() => expect(screen.getAllByTestId('link-suggestion')).toHaveLength(1));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Link' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
