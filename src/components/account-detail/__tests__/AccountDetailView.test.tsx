import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({ default: ({ href, children, ...r }: any) => <a href={href} {...r}>{children}</a> }));
vi.mock('../AccountActions', () => ({ AccountActions: () => <div data-testid="actions" /> }));
vi.mock('../AccountOverview', () => ({ AccountOverview: () => <div data-testid="overview" /> }));
vi.mock('../AccountRecentTransactions', () => ({ AccountRecentTransactions: () => <div data-testid="recent" /> }));
vi.mock('../BillsSection', () => ({ BillsSection: ({ accountId }: any) => <div data-testid="bills">{accountId}</div> }));
vi.mock('@/lib/query/hooks/useAccounts', () => ({ useAccount: vi.fn() }));

import { useAccount } from '@/lib/query/hooks/useAccounts';
import { renderWithQuery } from '@/test/renderWithQuery';

import { AccountDetailView } from '../AccountDetailView';

const acct = (o: any) => ({ id: 'a1', name: 'Name', warnings: [], balance: 1, ...o });

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useAccount).mockReturnValue({ data: undefined } as never);
});

describe('AccountDetailView', () => {
  it('seeds the live query with the server account and renders the header, overview and recent transactions', () => {
    const a = acct({ type: 'bank_account' });
    renderWithQuery(<AccountDetailView account={a as never} />);
    expect(useAccount).toHaveBeenCalledWith('a1', a);
    expect(screen.getByRole('heading', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByTestId('actions')).toBeInTheDocument();
    expect(screen.getByTestId('overview')).toBeInTheDocument();
    expect(screen.getByTestId('recent')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Accounts/ })).toHaveAttribute('href', '/accounts');
  });

  it('prefers the live (edited) account over the seed', () => {
    vi.mocked(useAccount).mockReturnValue({ data: acct({ type: 'bank_account', name: 'Renamed' }) } as never);
    renderWithQuery(<AccountDetailView account={acct({ type: 'bank_account' }) as never} />);
    expect(screen.getByRole('heading', { name: 'Renamed' })).toBeInTheDocument();
  });

  it('open credit card shows the Bills section for that account and Earning rules', () => {
    renderWithQuery(<AccountDetailView account={acct({ type: 'credit_card' }) as never} />);
    expect(screen.getByTestId('bills')).toHaveTextContent('a1');
    expect(screen.getByRole('link', { name: 'Manage rules' })).toHaveAttribute('href', '/rewards/rules?account=a1');
  });

  it('closed credit card has neither Bills nor Earning rules', () => {
    renderWithQuery(<AccountDetailView account={acct({ type: 'credit_card', closedOn: '2020-01-01' }) as never} />);
    expect(screen.queryByTestId('bills')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Manage rules' })).toBeNull();
  });

  it('bank and wallet accounts have Earning rules but no Bills', () => {
    for (const type of ['bank_account', 'generic']) {
      const { unmount } = renderWithQuery(<AccountDetailView account={acct({ type }) as never} />);
      expect(screen.queryByTestId('bills')).toBeNull();
      expect(screen.getByRole('link', { name: 'Manage rules' })).toBeInTheDocument();
      unmount();
    }
  });

  it('broker has neither Bills nor Earning rules', () => {
    renderWithQuery(<AccountDetailView account={acct({ type: 'broker' }) as never} />);
    expect(screen.queryByTestId('bills')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Manage rules' })).toBeNull();
  });

  it('a closed bank account hides Earning rules', () => {
    renderWithQuery(<AccountDetailView account={acct({ type: 'bank_account', closedOn: '2020-01-01' }) as never} />);
    expect(screen.queryByRole('link', { name: 'Manage rules' })).toBeNull();
  });
});
