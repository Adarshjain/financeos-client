import '@/test/next-mocks';

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({ default: ({ href, children, ...r }: any) => <a href={href} {...r}>{children}</a> }));
vi.mock('@/components/accounts/AccountFormWrapper', () => ({
  AccountFormWrapper: ({ account, children }: any) => <button data-testid="edit" data-id={account.id}>{children}</button>,
}));
vi.mock('@/components/accounts/StatementsDialog', () => ({
  StatementsDialog: ({ trigger }: any) => <div data-testid="statements">{trigger}</div>,
}));

import { AccountActions } from '../AccountActions';

const acct = (o: any) => ({ id: 'a1', name: 'N', warnings: [], ...o });

describe('AccountActions', () => {
  it('bank account: Edit, Statements and Import with the account preselected', () => {
    render(<AccountActions account={acct({ type: 'bank_account' })} />);
    expect(screen.getByTestId('edit')).toHaveTextContent('Edit');
    expect(screen.getByTestId('edit').dataset.id).toBe('a1');
    expect(screen.getByRole('button', { name: /Statements/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Import/ })).toHaveAttribute('href', '/transactions/import?account=a1');
  });

  it('credit card also gets Statements and Import', () => {
    render(<AccountActions account={acct({ type: 'credit_card' })} />);
    expect(screen.getByRole('button', { name: /Statements/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Import/ })).toBeInTheDocument();
  });

  it.each(['broker', 'generic'])('%s gets Edit only', (type) => {
    render(<AccountActions account={acct({ type })} />);
    expect(screen.getByTestId('edit')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Statements/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /Import/ })).toBeNull();
  });

  it('a closed account keeps Statements but hides Import', () => {
    render(<AccountActions account={acct({ type: 'bank_account', closedOn: '2020-01-01' })} />);
    expect(screen.getByRole('button', { name: /Statements/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Import/ })).toBeNull();
  });

  it('an account closing in the future still shows Import', () => {
    render(<AccountActions account={acct({ type: 'bank_account', closedOn: '2999-01-01' })} />);
    expect(screen.getByRole('link', { name: /Import/ })).toBeInTheDocument();
  });
});
