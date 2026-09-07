import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { LinksSection } from '@/components/transactions/detail-content/LinksSection';
import { useObligationRefs } from '@/components/transactions/detail-content/useObligationRefs';
import type { Account } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import type { ObligationRef, Transaction, TransactionLinkResponse } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

type Mock = ReturnType<typeof vi.fn>;

const accounts: Account[] = [{ id: 'acc1', name: 'HDFC Savings', type: AccountType.BANK_ACCOUNT }];

const txn: Transaction = {
  id: 't1',
  accountId: 'acc1',
  date: '2026-07-25',
  amount: -500,
  description: 'Zero balance item',
  source: 'manual',
  createdAt: '2026-07-25T00:00:00Z',
};

const txnLink: TransactionLinkResponse = {
  id: 'link1',
  type: 'TRANSFER',
  createdBy: 'USER',
  createdAt: '2026-07-25T00:00:00Z',
  note: '',
  members: [
    {
      transactionId: 't1',
      date: '2026-07-25',
      signedAmount: -500,
      description: 'Zero balance item',
      accountId: 'acc1',
      isAnchor: true,
      roleLabel: 'Transfer out',
    },
    {
      transactionId: 't-counterpart',
      date: '2026-07-25',
      signedAmount: 500,
      description: 'Transfer Counterpart',
      accountId: 'acc1',
      isAnchor: false,
      roleLabel: 'Transfer in',
    },
  ],
};

function Harness({
  links = [],
  refs = [],
  onCloseAndRefresh = vi.fn(),
}: {
  links?: TransactionLinkResponse[];
  refs?: ObligationRef[];
  onCloseAndRefresh?: () => void;
}) {
  const { unlinkingId, handleUnlink, handleUnlinkLoanPayment } = useObligationRefs(onCloseAndRefresh);

  return (
    <LinksSection
      transaction={txn}
      accounts={accounts}
      links={links}
      loadingLinks={false}
      linksError={null}
      unlinkingId={null}
      fetchLinks={vi.fn()}
      handleUnlink={vi.fn()}
      obligationRefs={refs}
      unlinkingObligationId={unlinkingId}
      onUnlinkLending={handleUnlink}
      onUnlinkLoanPayment={handleUnlinkLoanPayment}
    />
  );
}

describe('LinksSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when there are no transaction links and no obligation refs', () => {
    const { container } = renderWithQuery(<Harness links={[]} refs={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a single "Links" header', () => {
    renderWithQuery(
      <Harness refs={[{ kind: 'LENDING', id: 'r1', parentId: 'cp-1', label: 'Rahul Sharma' }]} />,
    );
    expect(screen.getAllByText('Links')).toHaveLength(1);
  });

  it('shows a "Transactions" group with the transaction links', () => {
    renderWithQuery(<Harness links={[txnLink]} />);

    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.getByText('Transfer Counterpart')).toBeInTheDocument();
  });

  it('shows a "Ledger & loans" group with ref labels, amounts, and an Open link', () => {
    renderWithQuery(
      <Harness
        refs={[{ kind: 'LENDING', id: 'r1', parentId: 'cp-1', label: 'Rahul Sharma', amount: 500 }]}
      />,
    );

    expect(screen.getByText('Ledger & loans')).toBeInTheDocument();
    expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
    expect(screen.getByText('₹500.00')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open/i })).toHaveAttribute(
      'href',
      '/loans/lendings/cp-1',
    );
  });

  it('unlinks a LENDING ref by calling DELETE /api/v1/lendings/{id}/transaction, then refreshes', async () => {
    (api.DELETE as Mock).mockResolvedValue({ data: undefined });
    const onCloseAndRefresh = vi.fn();

    renderWithQuery(
      <Harness
        refs={[{ kind: 'LENDING', id: 'lend-1', parentId: 'cp-1', label: 'Rahul Sharma' }]}
        onCloseAndRefresh={onCloseAndRefresh}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Unlink/i }));

    await waitFor(() => {
      expect(api.DELETE).toHaveBeenCalledWith('/api/v1/lendings/{id}/transaction', {
        params: { path: { id: 'lend-1' } },
      });
      expect(onCloseAndRefresh).toHaveBeenCalled();
    });
  });

  it('unlinks a LOAN_PAYMENT ref only after confirming, calling DELETE /api/v1/loans/{parentId}/payments/{id}', async () => {
    (api.DELETE as Mock).mockResolvedValue({ data: undefined });
    const onCloseAndRefresh = vi.fn();

    renderWithQuery(
      <Harness
        refs={[{ kind: 'LOAN_PAYMENT', id: 'pay-1', parentId: 'loan-1', label: 'EMI #3' }]}
        onCloseAndRefresh={onCloseAndRefresh}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Unlink/i }));

    expect(await screen.findByText('Remove this settlement?')).toBeInTheDocument();
    expect(api.DELETE).not.toHaveBeenCalled();

    const confirmButtons = screen.getAllByRole('button', { name: /Unlink/i });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(api.DELETE).toHaveBeenCalledWith('/api/v1/loans/{id}/payments/{paymentId}', {
        params: { path: { id: 'loan-1', paymentId: 'pay-1' } },
      });
      expect(onCloseAndRefresh).toHaveBeenCalled();
    });
  });

  it('renders no Unlink action for LOAN_EVENT or LOAN_CHARGE refs', () => {
    renderWithQuery(
      <Harness
        refs={[
          { kind: 'LOAN_EVENT', id: 'ev-1', parentId: 'loan-1', label: 'Rate change' },
          { kind: 'LOAN_CHARGE', id: 'ch-1', parentId: 'loan-1', label: 'Processing fee' },
        ]}
      />,
    );

    expect(screen.queryByRole('button', { name: /Unlink/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Open/i })).toHaveLength(2);
  });
});
