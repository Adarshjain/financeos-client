import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const approve = vi.fn();
let summary: unknown = null;
let pending = false;
vi.mock('./useApproveTransactions', () => ({
  useApproveTransactions: () => ({ approve, isPending: pending, summary, closeSummary: vi.fn() }),
}));

import { ApproveDialog } from './ApproveDialog';

const txns = [
  { id: 'a', reviewReasons: ['DATE_CORRECTED' as const, 'UNRECONCILED' as const] },
  { id: 'b', reviewReasons: ['DATE_CORRECTED' as const] },
  { id: 'c', reviewReasons: ['DATE_CORRECTED' as const] },
];

const box = (name: RegExp) => screen.getByRole('checkbox', { name });

describe('ApproveDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    summary = null;
    pending = false;
  });

  it('shows title, a row per reason with n of N, ticks the present ones', () => {
    render(<ApproveDialog transactions={txns} open onOpenChange={() => {}} />);
    expect(screen.getByText('Approve 3 transactions')).toBeTruthy();
    expect(screen.getByText('accept the statement date · 3 of 3')).toBeTruthy();
    expect(screen.getByText('no statement match needed · 1 of 3')).toBeTruthy();
    expect(screen.getByText('keep both · 0 of 3')).toBeTruthy();
    expect(box(/Date corrected/).getAttribute('data-state')).toBe('checked');
    expect(box(/Unreconciled/).getAttribute('data-state')).toBe('checked');
    expect(box(/Duplicate/).getAttribute('data-state')).toBe('unchecked');
  });

  it('approves with the ticked reasons, then closes and calls onDone', async () => {
    approve.mockResolvedValue(true);
    const onOpenChange = vi.fn();
    const onDone = vi.fn();
    render(<ApproveDialog transactions={txns} open onOpenChange={onOpenChange} onDone={onDone} />);
    fireEvent.click(box(/Unreconciled/));
    fireEvent.click(screen.getByRole('button', { name: 'Approve 3' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(approve).toHaveBeenCalledWith(txns, ['DATE_CORRECTED']);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('while approving, Approve and Cancel are disabled and the dialog cannot be dismissed', () => {
    pending = true;
    const onOpenChange = vi.fn();
    render(<ApproveDialog transactions={txns} open onOpenChange={onOpenChange} />);
    expect((screen.getByRole('button', { name: /Approve 3/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Cancel' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('disables Approve when nothing is ticked', () => {
    render(<ApproveDialog transactions={txns} open onOpenChange={() => {}} />);
    fireEvent.click(box(/Date corrected/));
    fireEvent.click(box(/Unreconciled/));
    expect((screen.getByRole('button', { name: 'Approve 3' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('stays open when the request fails', async () => {
    approve.mockResolvedValue(false);
    const onOpenChange = vi.fn();
    const onDone = vi.fn();
    render(<ApproveDialog transactions={txns} open onOpenChange={onOpenChange} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: 'Approve 3' }));
    await waitFor(() => expect(approve).toHaveBeenCalled());
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('Cancel closes without approving', () => {
    const onOpenChange = vi.fn();
    render(<ApproveDialog transactions={txns} open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(approve).not.toHaveBeenCalled();
  });

  it('opens the summary when the run left one', () => {
    summary = { succeededCount: 1, skippedCount: 1, failures: [], skips: ['IKEA'] };
    render(<ApproveDialog transactions={txns} open={false} onOpenChange={() => {}} />);
    expect(screen.getByText('Approve summary')).toBeTruthy();
    expect(screen.getByText('IKEA')).toBeTruthy();
  });
});
