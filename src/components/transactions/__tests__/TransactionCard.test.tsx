import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TransactionCard } from '@/components/transactions/TransactionCard';
import type { Account } from '@/lib/account.types';
import type { Category } from '@/lib/categories.types';
import type { Transaction } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';

const mockAccounts: Account[] = [
  { id: 'acc1', name: 'HDFC Bank', type: AccountType.BANK_ACCOUNT },
];

const mockCategories: Category[] = [
  { id: 'cat1', name: 'Shopping' },
];

const mockTxn: Transaction = {
  id: 't1',
  accountId: 'acc1',
  date: '2026-07-25',
  amount: -1250,
  description: 'Amazon Purchase',
  sourcedDescription: 'AMAZON PAY INDIA',
  source: 'gmail_transaction_alert',
  reviewType: 'NEEDS_REVIEW',
  reviewReasons: ['UNRECONCILED'],
  balance: 45000,
  createdAt: '2026-07-25T00:00:00Z',
  categories: mockCategories,
  links: [
    {
      linkId: 'link-1',
      type: 'REFUND',
      roleLabel: 'Refunded purchase',
      memberCount: 2,
    },
  ],
};

describe('TransactionCard (CD-8, CD-2c)', () => {
  it('renders transaction details, money format, and account name', () => {
    render(
      <TransactionCard
        transaction={mockTxn}
        accounts={mockAccounts}
        categories={mockCategories}
      />,
    );

    expect(screen.getByText('Amazon Purchase')).toBeInTheDocument();
    expect(screen.getByText('HDFC Bank')).toBeInTheDocument();
    expect(screen.getByText('- ₹1,250.00')).toBeInTheDocument();
    expect(screen.getByText('Bal: ₹45,000.00')).toBeInTheDocument();
  });

  it('renders source badge when showSource is true', () => {
    render(
      <TransactionCard
        transaction={mockTxn}
        accounts={mockAccounts}
        categories={mockCategories}
        showSource={true}
      />,
    );

    expect(screen.getByText('Gmail Alert')).toBeInTheDocument();
  });

  it('renders link badge with parent role label (CD-8)', () => {
    render(
      <TransactionCard
        transaction={mockTxn}
        accounts={mockAccounts}
        categories={mockCategories}
      />,
    );

    expect(screen.getByText('Parent • Refunded purchase')).toBeInTheDocument();
  });

  it('renders selection checkbox when selectable is true', () => {
    const onToggleSelect = vi.fn();
    render(
      <TransactionCard
        transaction={mockTxn}
        accounts={mockAccounts}
        categories={mockCategories}
        selectable={true}
        selected={false}
        onToggleSelect={onToggleSelect}
      />,
    );

    const checkboxWrapper = screen.getByRole('checkbox').parentElement!;
    fireEvent.click(checkboxWrapper);
    expect(onToggleSelect).toHaveBeenCalled();
  });

  it('renders gmail_statement, manual sources, monitoring/excluded states, and positive amounts', () => {
    const childTxn: Transaction = {
      ...mockTxn,
      id: 't2',
      description: undefined as any,
      sourcedDescription: 'UPI PAYEE',
      source: 'gmail_statement',
      amount: 2500,
      isTransactionUnderMonitoring: true,
      isTransactionExcluded: true,
      links: [
        {
          linkId: 'link-2',
          type: 'TRANSFER',
          roleLabel: 'Transfer in',
          memberCount: 3,
        },
      ],
    };

    const { rerender } = render(
      <TransactionCard
        transaction={childTxn}
        accounts={mockAccounts}
        categories={mockCategories}
        showSource={true}
      />,
    );

    expect(screen.getByText('UPI PAYEE')).toBeInTheDocument();
    expect(screen.getByText('Gmail Statement')).toBeInTheDocument();
    expect(screen.getByText('+ ₹2,500.00')).toBeInTheDocument();
    expect(screen.getByText('Transfer in')).toBeInTheDocument();

    const manualTxn: Transaction = {
      ...mockTxn,
      source: 'manual',
    };

    rerender(
      <TransactionCard
        transaction={manualTxn}
        accounts={mockAccounts}
        categories={mockCategories}
        showSource={true}
      />,
    );

    expect(screen.getByText('Manual')).toBeInTheDocument();
  });

  it('renders no source, link, or category badges when there is nothing to show', () => {
    const bareTxn: Transaction = {
      ...mockTxn,
      source: 'file_upload',
      reviewType: 'NA',
      links: [],
      categories: [],
    };

    render(
      <TransactionCard
        transaction={bareTxn}
        accounts={mockAccounts}
        categories={mockCategories}
        showSource={true}
      />,
    );

    // `file_upload` has no badge of its own, so the row stays empty.
    expect(screen.queryByText('Shopping')).not.toBeInTheDocument();
    expect(screen.queryByText(/Parent •/)).not.toBeInTheDocument();
    expect(screen.getByText('Amazon Purchase')).toBeInTheDocument();
  });

  it('derives the link role label when the link carries none', () => {
    const unlabelledTxn: Transaction = {
      ...mockTxn,
      links: [
        {
          linkId: 'link-3',
          type: 'TRANSFER',
          roleLabel: '',
          memberCount: 2,
        },
      ],
    };

    render(
      <TransactionCard
        transaction={unlabelledTxn}
        accounts={mockAccounts}
        categories={mockCategories}
      />,
    );

    expect(screen.getByText('Transfer in')).toBeInTheDocument();
  });
});
