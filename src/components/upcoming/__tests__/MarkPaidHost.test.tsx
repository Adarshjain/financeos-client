import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/query/hooks/useBills', () => ({ useBill: vi.fn(), useBillMutations: vi.fn() }));
vi.mock('@/components/bills/MarkPaidDialog', () => ({
  MarkPaidDialog: (p: any) =>
    p.open ? (
      <div data-testid="dlg">
        <button onClick={() => p.onSubmit({ amount: 5 })}>submit</button>
        <button onClick={() => p.onOpenChange(false)}>close</button>
        <span>{p.bill?.id}</span>
        <span>{p.submitting ? 'busy' : 'idle'}</span>
      </div>
    ) : null,
}));

import { toast } from 'sonner';

import { useBill, useBillMutations } from '@/lib/query/hooks/useBills';
import { renderWithQuery } from '@/test/renderWithQuery';

import { MarkPaidHost } from '../MarkPaidHost';

const mutateAsync = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useBill).mockReturnValue({ data: { id: 'bill-1' } } as never);
  vi.mocked(useBillMutations).mockReturnValue({ markPaid: { mutateAsync, isPending: false } } as never);
});

describe('MarkPaidHost', () => {
  it('only loads the bill when a statement id is set', () => {
    renderWithQuery(<MarkPaidHost statementId={null} onClose={vi.fn()} />);
    expect(useBill).toHaveBeenCalledWith(null, false);
    expect(screen.queryByTestId('dlg')).toBeNull();
  });

  it('stays closed until the bill has loaded', () => {
    vi.mocked(useBill).mockReturnValue({ data: undefined } as never);
    renderWithQuery(<MarkPaidHost statementId="S1" onClose={vi.fn()} />);
    expect(useBill).toHaveBeenCalledWith('S1', true);
    expect(screen.queryByTestId('dlg')).toBeNull();
  });

  it('opens with the bill and submits markPaid then toasts and closes', async () => {
    mutateAsync.mockResolvedValue({});
    const onClose = vi.fn();
    renderWithQuery(<MarkPaidHost statementId="S1" onClose={onClose} />);
    expect(screen.getByText('bill-1')).toBeInTheDocument();
    await userEvent.click(screen.getByText('submit'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mutateAsync).toHaveBeenCalledWith({ statementId: 'S1', body: { amount: 5 } });
    expect(toast.success).toHaveBeenCalledWith('Bill marked as paid');
  });

  it('on failure toasts the error and keeps the dialog open', async () => {
    mutateAsync.mockRejectedValue(new Error('boom'));
    const onClose = vi.fn();
    renderWithQuery(<MarkPaidHost statementId="S1" onClose={onClose} />);
    await userEvent.click(screen.getByText('submit'));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closing the dialog calls onClose; pending state is forwarded', async () => {
    vi.mocked(useBillMutations).mockReturnValue({ markPaid: { mutateAsync, isPending: true } } as never);
    const onClose = vi.fn();
    renderWithQuery(<MarkPaidHost statementId="S1" onClose={onClose} />);
    expect(screen.getByText('busy')).toBeInTheDocument();
    await userEvent.click(screen.getByText('close'));
    expect(onClose).toHaveBeenCalled();
  });
});
