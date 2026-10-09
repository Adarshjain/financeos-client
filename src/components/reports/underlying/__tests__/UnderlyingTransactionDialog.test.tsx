import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

interface DetailProps {
  transaction: { description: string } | null;
  accounts: { name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMutate: () => void;
  placeholder?: ReactNode;
}

// The detail dialog itself is covered by its own tests; here only what this
// wrapper feeds it matters: the latest props, and how often it mounts (one
// dialog instance from the tap until the transaction is shown).
const detail = vi.hoisted(() => ({ props: null as DetailProps | null, mounts: 0 }));
vi.mock('@/components/transactions/TransactionDetailDialog', async () => {
  const { useEffect } = await vi.importActual<typeof import('react')>('react');
  const { Dialog, DialogContent } = await vi.importActual<typeof import('@/components/ui/dialog')>('@/components/ui/dialog');
  return {
    TransactionDetailDialog: (props: DetailProps) => {
      detail.props = props;
      useEffect(() => {
        detail.mounts += 1;
      }, []);
      return (
        <Dialog open={props.open} onOpenChange={props.onOpenChange}>
          <DialogContent aria-describedby={undefined} srTitle={props.transaction ? 'Details' : undefined}>
            {props.transaction ? (
              <div data-testid="txn-detail">
                <span>{props.transaction.description}</span>
                <span>{props.accounts.map((a) => a.name).join(',')}</span>
                <button onClick={() => props.onMutate()}>mutate</button>
              </div>
            ) : (
              props.placeholder
            )}
          </DialogContent>
        </Dialog>
      );
    },
  };
});

import { api, ApiError } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { createTestQueryClient, renderWithQuery } from '@/test/renderWithQuery';

import { UnderlyingTransactionDialog } from '../UnderlyingTransactionDialog';

const TXN = '/api/v1/transactions/{id}';
const txns: Record<string, { id: string; description: string }> = {
  t1: { id: 't1', description: 'Coffee' },
  t2: { id: 't2', description: 'Fuel' },
};
const accounts = [{ id: 'acc1', name: 'HDFC Savings' }];

function mockGet({ txnResult, accountsResult }: { txnResult?: Promise<unknown>; accountsResult?: Promise<unknown> }) {
  vi.mocked(api.GET).mockImplementation(((path: string, init?: { params: { path: { id: string } } }) => {
    if (path === TXN) return txnResult ?? Promise.resolve({ data: txns[init!.params.path.id] });
    if (path === '/api/v1/accounts') return accountsResult ?? Promise.resolve({ data: accounts });
    throw new Error(`unexpected ${path}`);
  }) as never);
}

const txnCalls = () => (vi.mocked(api.GET).mock.calls as unknown as [string][]).filter(([path]) => path === TXN);

describe('UnderlyingTransactionDialog', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    detail.props = null;
    detail.mounts = 0;
  });

  it('renders nothing and fetches no transaction without an id', () => {
    mockGet({});
    renderWithQuery(<UnderlyingTransactionDialog transactionId={null} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(detail.props).toBeNull();
    expect(txnCalls()).toHaveLength(0);
  });

  it('reads the transaction by id and opens the detail dialog with the accounts', async () => {
    mockGet({});
    renderWithQuery(<UnderlyingTransactionDialog transactionId="t1" onClose={vi.fn()} />);
    expect(await screen.findByTestId('txn-detail')).toBeInTheDocument();
    expect(detail.props!.open).toBe(true);
    expect(screen.getByText('Coffee')).toBeInTheDocument();
    expect(screen.getByText('HDFC Savings')).toBeInTheDocument();
    expect(api.GET).toHaveBeenCalledWith(TXN, { params: { path: { id: 't1' } } });
  });

  it('opens the detail dialog at once with a titled skeleton placeholder while loading', () => {
    mockGet({ txnResult: new Promise(() => {}) });
    renderWithQuery(<UnderlyingTransactionDialog transactionId="t1" onClose={vi.fn()} />);
    expect(detail.props!.open).toBe(true);
    expect(detail.props!.transaction).toBeNull();
    const dialog = screen.getByRole('dialog');
    expect(screen.getByRole('heading', { name: 'Transaction' })).toBeInTheDocument();
    expect(dialog.querySelector('[data-slot="dialog-header"]')).not.toBeNull();
    expect(dialog.querySelector('[data-slot="dialog-body"]')).not.toHaveClass('pt-10');
    expect(screen.queryByTestId('txn-detail')).not.toBeInTheDocument();
  });

  it('fills the same dialog in place when the transaction arrives', async () => {
    let release!: () => void;
    mockGet({ txnResult: new Promise((resolve) => (release = () => resolve({ data: txns.t1 }))) });
    renderWithQuery(<UnderlyingTransactionDialog transactionId="t1" onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    release();
    expect(await screen.findByText('Coffee')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBe(dialog);
    expect(detail.mounts).toBe(1);
  });

  it('waits for the accounts too before showing the details', async () => {
    let release!: () => void;
    mockGet({ accountsResult: new Promise((resolve) => (release = () => resolve({ data: accounts }))) });
    renderWithQuery(<UnderlyingTransactionDialog transactionId="t1" onClose={vi.fn()} />);
    await waitFor(() => expect(txnCalls()).toHaveLength(1));
    expect(detail.props!.transaction).toBeNull();
    release();
    expect(await screen.findByText('HDFC Savings')).toBeInTheDocument();
  });

  it('shows the server message in the placeholder when the read fails', async () => {
    mockGet({ txnResult: Promise.reject(new ApiError(404, { message: 'Transaction not found' } as never)) });
    renderWithQuery(<UnderlyingTransactionDialog transactionId="t1" onClose={vi.fn()} />);
    expect(await screen.findByText('Transaction not found')).toHaveClass('text-rose-600');
  });

  it('shows the accounts failure the same way', async () => {
    mockGet({ accountsResult: Promise.reject(new ApiError(500, { message: 'Accounts down' } as never)) });
    renderWithQuery(<UnderlyingTransactionDialog transactionId="t1" onClose={vi.fn()} />);
    expect(await screen.findByText('Accounts down')).toHaveClass('text-rose-600');
  });

  it('calls onClose when the dialog is dismissed with the details showing', async () => {
    mockGet({});
    const onClose = vi.fn();
    renderWithQuery(<UnderlyingTransactionDialog transactionId="t1" onClose={onClose} />);
    await screen.findByText('Coffee');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the dialog is dismissed while loading', () => {
    mockGet({ txnResult: new Promise(() => {}) });
    const onClose = vi.fn();
    renderWithQuery(<UnderlyingTransactionDialog transactionId="t1" onClose={onClose} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stays mounted with the last transaction while closing, and reads nothing while closed', async () => {
    mockGet({});
    const { rerender } = renderWithQuery(<UnderlyingTransactionDialog transactionId="t1" onClose={vi.fn()} />);
    await screen.findByText('Coffee');
    rerender(<UnderlyingTransactionDialog transactionId={null} onClose={vi.fn()} />);
    expect(detail.props!.open).toBe(false);
    expect(detail.props!.transaction).toEqual(txns.t1);
    expect(detail.mounts).toBe(1);
    expect(txnCalls()).toHaveLength(1);
  });

  it('opens the next transaction in the same dialog instance, placeholder first', async () => {
    let release!: () => void;
    vi.mocked(api.GET).mockImplementation(((path: string, init?: { params: { path: { id: string } } }) => {
      if (path === '/api/v1/accounts') return Promise.resolve({ data: accounts });
      const id = init!.params.path.id;
      return id === 't2'
        ? new Promise((resolve) => (release = () => resolve({ data: txns.t2 })))
        : Promise.resolve({ data: txns.t1 });
    }) as never);
    const { rerender } = renderWithQuery(<UnderlyingTransactionDialog transactionId="t1" onClose={vi.fn()} />);
    await screen.findByText('Coffee');
    rerender(<UnderlyingTransactionDialog transactionId={null} onClose={vi.fn()} />);
    rerender(<UnderlyingTransactionDialog transactionId="t2" onClose={vi.fn()} />);
    expect(detail.props!.open).toBe(true);
    expect(detail.props!.transaction).toBeNull();
    expect(screen.getByRole('heading', { name: 'Transaction' })).toBeInTheDocument();
    release();
    expect(await screen.findByText('Fuel')).toBeInTheDocument();
    expect(detail.mounts).toBe(1);
  });

  it('refreshes transactions, reports and dashboards after an edit or delete', async () => {
    mockGet({});
    const queryClient = createTestQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    renderWithQuery(<UnderlyingTransactionDialog transactionId="t1" onClose={vi.fn()} />, { queryClient });
    fireEvent.click(await screen.findByText('mutate'));
    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(3));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.transactions.all });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.reports.all });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.dashboards.all });
  });
});
