import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));
const showToast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', () => ({ showToast: (...a: unknown[]) => showToast(...a) }));
vi.mock('./moveStatementAction', () => ({ moveStatement: vi.fn() }));
vi.mock('@/lib/query', () => ({
  useAccounts: () => ({
    data: [
      { id: 'a1', name: 'This one', type: 'bank_account' },
      { id: 'a2', name: 'HDFC Regalia', type: 'credit_card' },
      { id: 'a3', name: 'Zerodha', type: 'broker' },
    ],
    isLoading: false,
  }),
}));
vi.mock('@/components/organisms/AccountPicker/AccountPicker', () => ({
  AccountPicker: ({ accounts, value, onValueChange }: { accounts: { id: string; name: string }[]; value: string | null; onValueChange: (v: string) => void }) => (
    <select aria-label="Account" value={value ?? ''} onChange={(e) => onValueChange(e.target.value)}>
      <option value="" />
      {accounts.map((a) => (
        <option key={a.id} value={a.id}>{a.name}</option>
      ))}
    </select>
  ),
}));

import { moveStatement } from './moveStatementAction';
import { MoveStatementDialog } from './MoveStatementDialog';

const onOpenChange = vi.fn();
function renderIt() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MoveStatementDialog open onOpenChange={onOpenChange} accountId="a1" statementId="s1" periodEndLabel="5 Oct 2026" fy="2026" />
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe('MoveStatementDialog', () => {
  it('lists only other statement accounts, says what happens to the transactions and moves', async () => {
    vi.mocked(moveStatement).mockResolvedValue({ success: true, data: {} } as never);
    renderIt();
    expect(screen.getByText(/re-imported on the other account/)).toBeInTheDocument();
    const options = Array.from(screen.getByLabelText('Account').querySelectorAll('option')).map((o) => o.textContent);
    expect(options).toEqual(['', 'HDFC Regalia']);
    expect(screen.getByRole('button', { name: 'Move' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Account'), { target: { value: 'a2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Move' }));
    await waitFor(() => expect(moveStatement).toHaveBeenCalledWith('a1', 's1', 'a2'));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Moved to HDFC Regalia'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows the server message as an error toast on 409', async () => {
    vi.mocked(moveStatement).mockResolvedValue({
      success: false, status: 409, error: { code: 'FILE_EXPIRED', message: 'The file is no longer stored. Upload it again.' },
    } as never);
    renderIt();
    fireEvent.change(screen.getByLabelText('Account'), { target: { value: 'a2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Move' }));
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('The file is no longer stored. Upload it again.', { tone: 'danger' }),
    );
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
