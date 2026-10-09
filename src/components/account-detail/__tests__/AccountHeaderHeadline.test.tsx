import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { formatMoney } from '@/lib/utils';

import { AccountHeader } from '../AccountHeader';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const acct = (o: any) => ({ id: 'a1', name: 'My Acct', warnings: [], ...o });
const actions = <div data-testid="actions" />;

describe('AccountHeader headline amount', () => {
  it('shows what a credit card owes as a positive amount under Outstanding', () => {
    render(<AccountHeader account={acct({ type: 'credit_card', balance: -37149 })} actions={actions} />);
    expect(screen.getByText('Outstanding')).toBeInTheDocument();
    expect(screen.getByText(formatMoney(37149))).toBeInTheDocument();
    expect(screen.queryByText(formatMoney(-37149))).toBeNull();
  });

  it('labels an overpaid credit card In credit with the positive amount', () => {
    render(<AccountHeader account={acct({ type: 'credit_card', balance: 1200 })} actions={actions} />);
    expect(screen.getByText('In credit')).toBeInTheDocument();
    expect(screen.queryByText('Outstanding')).toBeNull();
    expect(screen.getByText(formatMoney(1200))).toBeInTheDocument();
  });

  it('treats a credit card with no balance as nothing outstanding', () => {
    render(<AccountHeader account={acct({ type: 'credit_card', balance: undefined })} actions={actions} />);
    expect(screen.getByText('Outstanding')).toBeInTheDocument();
    expect(screen.getByText(formatMoney(0))).toBeInTheDocument();
  });

  it('keeps the sign of a bank balance (an overdrawn account stays negative)', () => {
    render(<AccountHeader account={acct({ type: 'bank_account', balance: -500 })} actions={actions} />);
    expect(screen.getByText('Balance')).toBeInTheDocument();
    expect(screen.getByText(formatMoney(-500))).toBeInTheDocument();
  });

  it('renders the actions below the headline in their own row', () => {
    render(<AccountHeader account={acct({ type: 'bank_account', balance: 1 })} actions={actions} />);
    const actionsRow = screen.getByTestId('actions').parentElement!;
    expect(actionsRow.className).toContain('border-t');
  });
});
