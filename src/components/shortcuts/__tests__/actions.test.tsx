import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Each dialog module records when it is evaluated (= its code was loaded) and
// every mount; `failNext` makes the next load of the lending module reject.
const loads = vi.hoisted(() => ({
  transaction: 0,
  lending: 0,
  failLending: false,
  mounts: [] as Array<{ which: string; preset?: unknown }>,
}));

vi.mock('@/components/transactions/TransactionFormWrapper', () => {
  loads.transaction += 1;
  return {
    TransactionFormWrapper: ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => {
      loads.mounts.push({ which: 'transaction' });
      return open ? (
        <div data-testid="txn-form">
          <button onClick={() => onOpenChange(false)}>close txn</button>
        </div>
      ) : null;
    },
  };
});
vi.mock('@/components/lendings/RecordLendingDialog', () => {
  loads.lending += 1;
  return {
    get RecordLendingDialog() {
      if (loads.failLending) throw new Error('chunk failed');
      return function RecordLendingDialog({ open, preset }: { open: boolean; preset?: { amount?: number } }) {
        loads.mounts.push({ which: 'lending', preset });
        return open ? <div data-testid="lending-form">{preset?.amount ?? 'no preset'}</div> : null;
      };
    },
  };
});
vi.mock('@/lib/toastError', () => ({ toastError: vi.fn() }));

import {
  getAction,
  prefetchAction,
  SHORTCUT_ACTIONS,
  useActionLauncher,
} from '@/components/shortcuts/actions';
import { toastError } from '@/lib/toastError';

function Host() {
  const launcher = useActionLauncher();
  return (
    <>
      <span data-testid="pending">{launcher.pendingId ?? 'none'}</span>
      {launcher.dialog}
    </>
  );
}

describe('shortcut actions', () => {
  beforeEach(() => {
    loads.mounts = [];
    loads.failLending = false;
    vi.mocked(toastError).mockReset();
  });

  it('defines the five actions: two dialogs and three page links', () => {
    expect(Object.keys(SHORTCUT_ACTIONS).sort()).toEqual(
      ['add-transaction', 'ask-chat', 'import-statement', 'record-lending', 'review-queue'],
    );
    expect(getAction('add-transaction')).toMatchObject({ kind: 'dialog', label: 'Add transaction' });
    expect(getAction('record-lending')).toMatchObject({ kind: 'dialog', label: 'Record lending' });
    expect(getAction('import-statement')).toMatchObject({ kind: 'page', href: '/transactions/import' });
    expect(getAction('ask-chat')).toMatchObject({ kind: 'page', href: '/chat' });
    expect(getAction('review-queue')).toMatchObject({ kind: 'page', href: '/transactions/review' });
  });

  it('getAction returns null for unknown and prototype ids', () => {
    expect(getAction('nope')).toBeNull();
    expect(getAction('toString')).toBeNull();
  });

  it('loads and mounts nothing until asked (this test runs before any load)', () => {
    render(<Host />);
    expect(loads.transaction).toBe(0);
    expect(loads.lending).toBe(0);
    expect(loads.mounts).toEqual([]);
    expect(screen.getByTestId('pending')).toHaveTextContent('none');
  });

  it('prefetch loads only that dialog`s code and mounts nothing; page and unknown ids are no-ops', async () => {
    prefetchAction('ask-chat');
    prefetchAction('nope');
    prefetchAction('add-transaction');
    await waitFor(() => expect(loads.transaction).toBe(1));
    expect(loads.lending).toBe(0);
    expect(loads.mounts).toEqual([]);
  });

  it('launch shows the pending action while loading, then opens the dialog; closing closes it', async () => {
    const { result } = renderHook(() => useActionLauncher());
    let launching!: Promise<void>;
    act(() => {
      launching = result.current.launch('add-transaction');
    });
    expect(result.current.pendingId).toBe('add-transaction');
    await act(async () => {
      await launching;
    });
    expect(result.current.pendingId).toBeNull();

    const { rerender } = render(<>{result.current.dialog}</>);
    expect(await screen.findByTestId('txn-form')).toBeInTheDocument();
    act(() => screen.getByText('close txn').click());
    rerender(<>{result.current.dialog}</>);
    await waitFor(() => expect(screen.queryByTestId('txn-form')).not.toBeInTheDocument());
  });

  it('record-lending receives the preset, and a new launch remounts with the new preset', async () => {
    render(<LendingHost />);
    act(() => screen.getByText('settle 500').click());
    expect(await screen.findByTestId('lending-form')).toHaveTextContent('500');
    act(() => screen.getByText('settle 900').click());
    await waitFor(() => expect(screen.getByTestId('lending-form')).toHaveTextContent('900'));
    expect(loads.mounts.filter((m) => m.which === 'lending').map((m) => (m.preset as { amount: number }).amount)).toContain(900);
  });

  it('launching a page action or an unknown id does nothing', async () => {
    const { result } = renderHook(() => useActionLauncher());
    await act(async () => {
      await result.current.launch('ask-chat');
      await result.current.launch('nope');
    });
    expect(result.current.pendingId).toBeNull();
    expect(result.current.dialog).toBeNull();
  });

  it('a failed load reports the error, clears pending and opens nothing', async () => {
    loads.failLending = true;
    const { result } = renderHook(() => useActionLauncher());
    await act(async () => {
      await result.current.launch('record-lending');
    });
    expect(toastError).toHaveBeenCalledWith(expect.any(Error), expect.stringContaining('Could not open'));
    expect(result.current.pendingId).toBeNull();
    expect(result.current.dialog).toBeNull();
  });
});

function LendingHost() {
  const { launch, dialog } = useActionLauncher();
  return (
    <>
      <button onClick={() => void launch('record-lending', { amount: 500 })}>settle 500</button>
      <button onClick={() => void launch('record-lending', { amount: 900 })}>settle 900</button>
      {dialog}
    </>
  );
}
