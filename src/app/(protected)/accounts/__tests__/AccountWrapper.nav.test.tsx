import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({ default: ({ href, children, ...r }: any) => <a href={href} {...r}>{children}</a> }));
vi.mock('@/components/accounts/AccountFormWrapper', () => ({
  AccountFormWrapper: ({ children, triggerClassName }: any) => (
    <button data-testid="edit" className={triggerClassName}>{children}</button>
  ),
}));
vi.mock('@/components/accounts/StatementsDialog', () => ({ StatementsDialog: ({ trigger }: any) => trigger }));
vi.mock('@/components/accounts/CardsDialog', () => ({ CardsDialog: ({ trigger }: any) => trigger }));

import { AccountWrapper } from '../components/AccountWrapper';

const acct = (type: string, o: any = {}) => ({ id: 'acc-9', name: 'N', type, warnings: [], ...o }) as never;

describe('AccountWrapper navigation', () => {
  it('the tile body is a link to /accounts/<id> containing the children', () => {
    render(<AccountWrapper account={acct('bank_account')}><span>tile body</span></AccountWrapper>);
    const link = screen.getByText('tile body').closest('a')!;
    expect(link).toHaveAttribute('href', '/accounts/acc-9');
  });

  it('edit is a separate button that is not nested inside the link, and not wrapping the body', () => {
    render(<AccountWrapper account={acct('bank_account')}><span>tile body</span></AccountWrapper>);
    const edit = screen.getByTestId('edit');
    expect(edit.closest('a')).toBeNull();
    expect(edit.contains(screen.getByText('tile body'))).toBe(false);
    expect(edit.querySelector('[aria-label="Edit account"]')).not.toBeNull();
  });

  it('nested interactive elements: no button or link inside the body link', () => {
    render(<AccountWrapper account={acct('credit_card')}><span>tile body</span></AccountWrapper>);
    const link = screen.getByText('tile body').closest('a')!;
    expect(link.querySelector('button, a')).toBeNull();
  });

  it('bank and credit card keep Statements and Cards actions; wallet and broker have none', () => {
    const { unmount } = render(<AccountWrapper account={acct('bank_account')}>x</AccountWrapper>);
    expect(screen.getByRole('button', { name: /Statements/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cards/ })).toBeInTheDocument();
    unmount();
    for (const t of ['generic', 'broker']) {
      const r = render(<AccountWrapper account={acct(t)}>x</AccountWrapper>);
      expect(screen.queryByRole('button', { name: /Statements|Cards/ })).toBeNull();
      r.unmount();
    }
  });

  it('closed accounts are dimmed', () => {
    const { container } = render(<AccountWrapper account={acct('bank_account', { closedOn: '2020-01-01' })}>x</AccountWrapper>);
    expect((container.firstChild as HTMLElement).className).toContain('opacity-65');
  });
});
