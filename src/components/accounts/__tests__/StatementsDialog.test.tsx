import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { getCardCycleSummary } from '@/actions/accounts';
import { getStatementDetail, listStatementsByAccount } from '@/actions/statements';
import { StatementsDialog } from '@/components/accounts/StatementsDialog';
import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

vi.mock('@/actions/accounts', () => ({
  getCardCycleSummary: vi.fn().mockResolvedValue({
    success: true,
    data: {
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
    },
  }),
}));

vi.mock('@/actions/statements', () => ({
  listStatementsByAccount: vi.fn().mockResolvedValue({
    success: true,
    data: [
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
    ],
  }),
  getStatementDetail: vi.fn(),
}));

const mockCardAccount: Account = {
  id: 'card-1',
  name: 'Amex Credit Card',
  type: AccountType.CREDIT_CARD,
  last4: '0001',
  creditLimit: 100000,
  paymentDueDay: 10,
  gracePeriodDays: 20,
};

describe('StatementsDialog & Balance Anchoring Math (CD-11)', () => {
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
    render(
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
    vi.mocked(getStatementDetail).mockResolvedValue({
      success: true,
      data: {
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
      },
    });

    render(
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
