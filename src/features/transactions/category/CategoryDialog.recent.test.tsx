import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ recent: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/lib/query/actions/categoryListActions', async () => {
  const { CATEGORY_LIST_FIXTURE } = await import('@/lib/categoryList.fixtures');
  return { loadCategoryList: vi.fn(async () => ({ success: true, data: CATEGORY_LIST_FIXTURE })) };
});
vi.mock('@/lib/query/actions/uncategorizedActions', () => ({ loadCategoryRecent: mocks.recent }));
vi.mock('../transactionActions', () => ({ setTransactionCategory: vi.fn() }));

import type { Transaction } from '@/lib/transaction.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { CategoryDialog } from './CategoryDialog';

const txn = (amount: number) => ({ id: 't1', amount, description: 'Swiggy', accountId: 'a', date: '2026-10-29' }) as unknown as Transaction;

describe('CategoryDialog recent picks', () => {
  it('asks for the money-out picks of a debit and shows them as a one-tap line', async () => {
    mocks.recent.mockResolvedValue({ success: true, data: [{ categoryKey: 'transport', subcategoryKey: 'transport.cabs' }] });
    renderWithQuery(<CategoryDialog transaction={txn(-486)} onClose={vi.fn()} />);
    expect(await screen.findByRole('button', { name: 'Transport · Cabs' })).toBeInTheDocument();
    expect(mocks.recent).toHaveBeenCalledWith('OUT');
  });

  it('asks for the money-in picks of a credit', async () => {
    mocks.recent.mockResolvedValue({ success: true, data: [] });
    renderWithQuery(<CategoryDialog transaction={txn(185000)} onClose={vi.fn()} />);
    await screen.findByRole('button', { name: 'Salary' });
    expect(mocks.recent).toHaveBeenCalledWith('IN');
  });
});
