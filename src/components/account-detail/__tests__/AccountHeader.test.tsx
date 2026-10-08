import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { formatMoney } from '@/lib/utils';

import { AccountHeader } from '../AccountHeader';

const acct = (o: any) => ({ id: 'a1', name: 'My Acct', warnings: [], ...o });
const actions = <div data-testid="actions" />;

describe('AccountHeader', () => {
  it('bank account: name, type label, last4, Balance label and amount, actions slot', () => {
    render(<AccountHeader account={acct({ type: 'bank_account', last4: '4321', balance: 15000 })} actions={actions} />);
    expect(screen.getByRole('heading', { name: 'My Acct' })).toBeInTheDocument();
    expect(screen.getByText('Bank account · •••• 4321')).toBeInTheDocument();
    expect(screen.getByText('Balance')).toBeInTheDocument();
    expect(screen.getByText(formatMoney(15000))).toBeInTheDocument();
    expect(screen.getByTestId('actions')).toBeInTheDocument();
  });

  it('credit card is labelled Outstanding', () => {
    render(<AccountHeader account={acct({ type: 'credit_card', balance: -500 })} actions={actions} />);
    expect(screen.getByText('Credit card')).toBeInTheDocument();
    expect(screen.getByText('Outstanding')).toBeInTheDocument();
  });

  it('broker shows Portfolio value and treats a missing balance as zero', () => {
    render(<AccountHeader account={acct({ type: 'broker' })} actions={actions} />);
    expect(screen.getByText('Broker')).toBeInTheDocument();
    expect(screen.getByText('Portfolio value')).toBeInTheDocument();
    expect(screen.getByText(formatMoney(0))).toBeInTheDocument();
  });

  it('generic is Wallet / Cash and a null balance renders an em dash', () => {
    render(<AccountHeader account={acct({ type: 'generic', balance: null })} actions={actions} />);
    expect(screen.getByText('Wallet / Cash')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('omits last4 when absent and shows a Closed badge only for closed accounts', () => {
    const { rerender } = render(<AccountHeader account={acct({ type: 'bank_account', balance: 1, closedOn: '2020-01-01' })} actions={actions} />);
    expect(screen.getByText('Bank account')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
    rerender(<AccountHeader account={acct({ type: 'bank_account', balance: 1, closedOn: '2999-01-01' })} actions={actions} />);
    expect(screen.queryByText('Closed')).toBeNull();
    rerender(<AccountHeader account={acct({ type: 'bank_account', balance: 1 })} actions={actions} />);
    expect(screen.queryByText('Closed')).toBeNull();
  });
});
