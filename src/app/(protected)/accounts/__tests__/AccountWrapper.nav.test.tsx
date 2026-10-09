import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({ default: ({ href, children, ...r }: any) => <a href={href} {...r}>{children}</a> }));
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

  it('the tile has no edit control: editing lives on the account page', () => {
    for (const t of ['bank_account', 'credit_card', 'generic', 'broker']) {
      const r = render(<AccountWrapper account={acct(t)}><span>tile body</span></AccountWrapper>);
      expect(screen.queryByLabelText(/Edit account/i)).toBeNull();
      expect(screen.queryByRole('button', { name: /Edit/i })).toBeNull();
      r.unmount();
    }
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
