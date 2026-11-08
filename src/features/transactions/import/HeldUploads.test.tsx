import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Account } from '@/lib/account.types';
import { ActionError } from '@/lib/actionResult';

const showToast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', () => ({ showToast: (...a: unknown[]) => showToast(...a) }));
vi.mock('./importActions', () => ({
  listHeldUploads: vi.fn(),
  assignHeldUpload: vi.fn(),
  deleteHeldUpload: vi.fn(),
  retryFileWithPassword: vi.fn(),
}));
// The account picker is a Select; a native select keeps the test about this section.
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
vi.mock('@/features/accounts/form/ds/AccountDialogs', () => ({
  loadAccountForm: () =>
    Promise.resolve(({ onCreated, onClose, prefillLast4 }: { onCreated: (a: { id: string }) => void; onClose: () => void; prefillLast4?: string }) => (
      <div>
        <span>prefill {prefillLast4}</span>
        <button onClick={() => { onCreated({ id: 'new-acc' }); onClose(); }}>Save account</button>
      </div>
    )),
}));

import { HeldUploads } from './HeldUploads';
import { assignHeldUpload, deleteHeldUpload } from './importActions';

const accounts = [{ id: 'a1', name: 'HDFC Savings', type: 'bank_account' }] as unknown as Account[];
const held = [
  { id: 'h1', fileName: 'Oct.pdf', createdAt: '2026-10-05T04:00:00Z', detectedBankId: 'hdfc', detectedLast4: '1234', candidateAccountIds: [], jobId: 'j1', reason: 'NO_MATCH' },
  { id: 'h2', fileName: 'Sep.pdf', createdAt: '2026-10-04T04:00:00Z', candidateAccountIds: [], jobId: 'j1', reason: 'NO_MATCH' },
] as never;
const ok = { success: true, data: { fileDetails: [{ filename: 'Oct.pdf', status: 'SUCCESS' }] } };

function renderIt(heldId?: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <HeldUploads accounts={accounts} initialHeld={held} heldId={heldId} />
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe('HeldUploads', () => {
  it('lists each file with what is known about it', () => {
    renderIt();
    expect(screen.getAllByTestId('held-file')).toHaveLength(2);
    expect(screen.getByText('Oct.pdf')).toBeInTheDocument();
    expect(screen.getByText(/••1234/)).toBeInTheDocument();
  });

  it('imports into the picked account', async () => {
    vi.mocked(assignHeldUpload).mockResolvedValue(ok as never);
    renderIt();
    const [first] = screen.getAllByTestId('held-file');
    const imp = first.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(imp).toBeDisabled();
    fireEvent.change(first.querySelector('select')!, { target: { value: 'a1' } });
    fireEvent.click(imp);
    await waitFor(() => expect(assignHeldUpload).toHaveBeenCalledWith('h1', 'a1', undefined));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Imported Oct.pdf'));
  });

  it('asks for the password on a 422 and retries with it', async () => {
    vi.mocked(assignHeldUpload)
      .mockResolvedValueOnce({ success: false, status: 422, error: { code: 'PASSWORD_REQUIRED', message: 'locked' } } as never)
      .mockResolvedValueOnce(ok as never);
    renderIt();
    const [first] = screen.getAllByTestId('held-file');
    fireEvent.change(first.querySelector('select')!, { target: { value: 'a1' } });
    fireEvent.click(first.querySelector('button[type="submit"]')!);
    const field = await screen.findByLabelText('Statement password');
    fireEvent.change(field, { target: { value: 'secret' } });
    fireEvent.click(first.querySelector('button[type="submit"]')!);
    await waitFor(() => expect(assignHeldUpload).toHaveBeenLastCalledWith('h1', 'a1', 'secret'));
  });

  it('creates an account and assigns the file to it', async () => {
    vi.mocked(assignHeldUpload).mockResolvedValue(ok as never);
    renderIt();
    fireEvent.click(screen.getAllByRole('button', { name: 'Create account' })[0]);
    expect(await screen.findByText('prefill 1234')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save account' }));
    await waitFor(() => expect(assignHeldUpload).toHaveBeenCalledWith('h1', 'new-acc', undefined));
  });

  it('ignores a second submit while the file is importing', async () => {
    let resolve!: (v: unknown) => void;
    vi.mocked(assignHeldUpload).mockReturnValueOnce(new Promise((r) => { resolve = r; }) as never);
    renderIt();
    const first = screen.getAllByTestId('held-file')[0];
    fireEvent.change(within(first).getByLabelText('Account'), { target: { value: 'a1' } });
    fireEvent.click(first.querySelector('button[type="submit"]')!);
    await waitFor(() => expect(first.querySelector('button[type="submit"]')).toBeDisabled());
    fireEvent.submit(first.querySelector('form')!);
    expect(assignHeldUpload).toHaveBeenCalledTimes(1);
    resolve(ok);
    await waitFor(() => expect(first.querySelector('button[type="submit"]')).not.toBeDisabled());
  });

  it('asks before removing, and removes on confirm', async () => {
    vi.mocked(deleteHeldUpload).mockResolvedValue({ success: true, data: undefined } as never);
    renderIt();
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]);
    expect(deleteHeldUpload).not.toHaveBeenCalled();
    expect(await screen.findByText('Remove this file?')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' }).at(-1)!);
    await waitFor(() => expect(deleteHeldUpload).toHaveBeenCalledWith('h1'));
  });

  it('shows a wrong-password message when a retry fails again', async () => {
    vi.mocked(assignHeldUpload).mockResolvedValue({ success: false, status: 422, error: { code: 'WRONG_PASSWORD', message: 'bad' } } as never);
    renderIt();
    const [first] = screen.getAllByTestId('held-file');
    fireEvent.change(first.querySelector('select')!, { target: { value: 'a1' } });
    fireEvent.click(first.querySelector('button[type="submit"]')!);
    expect(await screen.findByText("That password didn't work.")).toBeInTheDocument();
    expect(ActionError).toBeDefined();
  });
});
