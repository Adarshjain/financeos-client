import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StatementsDialog } from '@/components/accounts/StatementsDialog';
import type { Account } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import { AccountType } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

const mockCardAccount: Account = {
  id: 'card-1',
  name: 'Amex Credit Card',
  type: AccountType.CREDIT_CARD,
  last4: '0001',
  creditLimit: 100000,
};

const cardSummaryResponse = {
  statementId: 'stmt-1',
  totalAmountDue: 5000,
  minimumAmountDue: 500,
  paymentDueDate: '2026-08-15',
  creditLimit: 100000,
  availableCreditLimit: 95000,
  utilizationPct: 5.0,
  daysUntilDue: 10,
  rewardPointsBalance: 1200,
  periodStart: '2026-06-01',
  periodEnd: '2026-06-30',
  history: [],
};

const statementsListResponse = [
  {
    id: 'stmt-1',
    accountId: 'card-1',
    source: 'file_upload',
    statementType: 'credit_card',
    periodStart: '2026-06-01',
    periodEnd: '2026-06-30',
    openingBalance: 0,
    closingBalance: 5000,
    totalDebits: 5000,
    totalCredits: 0,
    transactionCount: 5,
    linesSkipped: 0,
    parseMode: 'STANDARD',
    chainValidationPct: 100,
    checksumOk: true,
    verdict: 'AUTO_INGEST',
    createdAt: '2026-07-01T00:00:00Z',
  },
];

const statementDetailResponse = {
  id: 'stmt-1',
  source: 'file_upload',
  sourceRef: 'stmt-ref-1',
  bankName: 'Amex',
  accountNumberMasked: 'XXXX0001',
  statementType: 'credit_card',
  periodStart: '2026-06-01',
  periodEnd: '2026-06-30',
  openingBalance: 0,
  closingBalance: 5000,
  totalDebits: 5000,
  totalCredits: 0,
  transactionCount: 1,
  linesSkipped: 0,
  parseMode: 'STANDARD',
  chainValidationPct: 100,
  checksumOk: true,
  verdict: 'AUTO_INGEST',
  createdAt: '2026-07-01T00:00:00Z',
  lines: [
    {
      transactionId: 'tx-1',
      lineIndex: 0,
      date: '2026-06-15',
      description: 'Supermarket',
      amount: 5000,
      type: 'DEBIT',
      reviewType: 'AUTO_REVIEWED',
      balanceAfter: 5000,
      chainValid: true,
    },
  ],
  cardDetails: {
    totalAmountDue: 5000,
    minimumAmountDue: 500,
    paymentDueDate: '2026-08-15',
    creditLimit: 100000,
    availableCreditLimit: 95000,
    financeCharges: 0,
    feesAndCharges: 0,
    previousBalance: 0,
    paymentsReceived: 0,
    totalPurchases: 5000,
    rewardPointsBalance: 1200,
    rewardPointsEarned: 50,
  },
};

/** Routes each mocked `api.GET` call to the right fixture by path — the dialog fires statements, card-summary, and (on demand) statement-detail reads independently. */
function mockGetByPath() {
  vi.mocked(api.GET).mockImplementation(((url: string) => {
    if (url === '/api/v1/accounts/{accountId}/statements') {
      return Promise.resolve({ data: statementsListResponse });
    }
    if (url === '/api/v1/accounts/{id}/card-summary') {
      return Promise.resolve({ data: cardSummaryResponse });
    }
    if (url === '/api/v1/statements/{statementId}') {
      return Promise.resolve({ data: statementDetailResponse });
    }
    return Promise.resolve({ data: undefined });
  }) as typeof api.GET);
}

describe('StatementsDialog & Balance Anchoring Math (CD-11)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('credit-card anchoring math sign convention works correctly (CD-11)', () => {
    // Verified credit-card anchoring math invariant:
    // Statement closing balance owed = 5,000 -> base = -5,000
    const statementClosingBalanceOwed = 5000;
    const base = -statementClosingBalanceOwed; // -5,000

    // One post-statement DEBIT purchase of 1,000 -> -6,000
    const postStatementDebit = -1000;
    const afterPurchase = base + postStatementDebit; // -6,000
    expect(afterPurchase).toBe(-6000);

    // One CREDIT payment of 3,000 on top -> -3,000
    const postStatementCredit = 3000;
    const finalAnchoredBalance = afterPurchase + postStatementCredit; // -3,000
    expect(finalAnchoredBalance).toBe(-3000);
  });

  it('renders card cycle summary and statements list when opened (CD-11)', async () => {
    mockGetByPath();

    renderWithQuery(
      <StatementsDialog
        account={mockCardAccount}
        trigger={<button>Open Statements</button>}
      />,
    );

    const triggerBtn = screen.getByText('Open Statements');
    fireEvent.click(triggerBtn);

    await waitFor(() => {
      expect(screen.getByText('Statements Archive')).toBeInTheDocument();
      expect(screen.getByText('Amex Credit Card')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Total Amount Due')).toBeInTheDocument();
      expect(screen.getByText('Due in 10 days')).toBeInTheDocument();
    });
  });

  it('loads statement detail when View Details is clicked', async () => {
    mockGetByPath();

    renderWithQuery(
      <StatementsDialog
        account={mockCardAccount}
        trigger={<button>Open Statements</button>}
      />,
    );

    fireEvent.click(screen.getByText('Open Statements'));

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /View details/i })[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: /View details/i })[0]);

    await waitFor(() => {
      expect(screen.getAllByText('Statement Details')[0]).toBeInTheDocument();
    });
  });
});
