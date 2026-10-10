import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { formatDate, formatMoney } from '@/lib/utils';

import { AccountOverview } from '../AccountOverview';

const acct = (o: any) => ({ id: 'a1', name: 'N', warnings: [], ...o });

describe('AccountOverview', () => {
  it('a bare account says there are no further details', () => {
    render(<AccountOverview account={acct({ type: 'generic' })} />);
    expect(screen.getByText('No further details.')).toBeInTheDocument();
  });

  it('lists description, anchored date (only when anchored), closed on, gmail sync, last statement', () => {
    render(
      <AccountOverview
        account={acct({
          type: 'bank_account',
          description: 'Salary',
          balanceAnchored: true,
          anchorDate: '2026-01-02',
          closedOn: '2026-03-04',
          ingestFromDate: '2026-02-01',
          lastStatementDate: '2026-02-28',
        })}
      />
    );
    expect(screen.getByText('Salary')).toBeInTheDocument();
    expect(screen.getByText(formatDate('2026-01-02'))).toBeInTheDocument();
    expect(screen.getByText(formatDate('2026-03-04'))).toBeInTheDocument();
    expect(screen.getByText('Gmail sync from')).toBeInTheDocument();
    expect(screen.getByText('Last statement')).toBeInTheDocument();
  });

  it('does not show an anchor row when the balance is not anchored', () => {
    render(<AccountOverview account={acct({ type: 'bank_account', balanceAnchored: false, anchorDate: '2026-01-02' })} />);
    expect(screen.queryByText('Balance anchored')).toBeNull();
  });

  it('broker shows cash balance, including zero', () => {
    render(<AccountOverview account={acct({ type: 'broker', cashBalance: 0 })} />);
    expect(screen.getByText('Cash balance')).toBeInTheDocument();
    expect(screen.getByText(formatMoney(0))).toBeInTheDocument();
  });

  it('credit card shows limit, the server utilisation, and issuer + product', () => {
    render(<AccountOverview account={acct({ type: 'credit_card', creditLimit: 100000, effectiveCreditLimit: 100000, balance: -25000, utilizationPct: 25, issuer: 'HDFC', productName: 'Regalia' })} />);
    expect(screen.getByText(formatMoney(100000))).toBeInTheDocument();
    expect(screen.getByText('Utilisation 25.0%')).toBeInTheDocument();
    expect(screen.getByText('HDFC Regalia')).toBeInTheDocument();
    expect(screen.queryByText('No further details.')).toBeNull();
  });

  it('shows the effective limit the percent is measured against: the statement limit when the card has none', () => {
    render(<AccountOverview account={acct({ type: 'credit_card', creditLimit: 0, effectiveCreditLimit: 80000, balance: -20000, utilizationPct: 25 })} />);
    expect(screen.getByText(formatMoney(80000))).toBeInTheDocument();
    expect(screen.queryByText(formatMoney(0))).toBeNull();
    expect(screen.getByText('Utilisation 25.0%')).toBeInTheDocument();
  });

  it('no limit at all: "Not set" next to an unknown utilisation', () => {
    render(<AccountOverview account={acct({ type: 'credit_card', creditLimit: 0, effectiveCreditLimit: null, balance: -20000, utilizationPct: null })} />);
    expect(screen.getByText('Not set')).toBeInTheDocument();
  });

  it('a card in credit shows the server 0%, not the absolute balance', () => {
    render(<AccountOverview account={acct({ type: 'credit_card', creditLimit: 100000, balance: 25000, utilizationPct: 0 })} />);
    expect(screen.getByText('Utilisation 0.0%')).toBeInTheDocument();
  });

  it('utilisation bar colour thresholds: green below 30, amber from 30, rose from 70', () => {
    const bar = (pct: number) => {
      const { container, unmount } = render(<AccountOverview account={acct({ type: 'credit_card', creditLimit: 100, balance: -pct, utilizationPct: pct })} />);
      const cls = container.querySelector('.h-1\\.5 > div')!.className;
      unmount();
      return cls;
    };
    expect(bar(29.9)).toContain('bg-emerald-500');
    expect(bar(30)).toContain('bg-amber-500');
    expect(bar(69.9)).toContain('bg-amber-500');
    expect(bar(70)).toContain('bg-rose-500');
  });

  it('no server utilisation (no limit) shows a dash and an empty bar; over 100% caps the bar', () => {
    const { container, rerender } = render(<AccountOverview account={acct({ type: 'credit_card', creditLimit: 0, balance: -500, utilizationPct: null })} />);
    expect(screen.getByText('Utilisation —')).toBeInTheDocument();
    expect((container.querySelector('.h-1\\.5 > div') as HTMLElement).style.width).toBe('0%');
    rerender(<AccountOverview account={acct({ type: 'credit_card', creditLimit: 100, balance: -500, utilizationPct: 500 })} />);
    expect((container.querySelector('.h-1\\.5 > div') as HTMLElement).style.width).toBe('100%');
  });

  it('cardholders: person name or role fallback; active card last4; closed-only means no active card', () => {
    render(
      <AccountOverview
        account={acct({
          type: 'credit_card',
          creditLimit: 1000,
          balance: 0,
          cardholders: [
            { id: 'c1', role: 'PRIMARY', personName: 'Asha', currentLast4: '1111', cards: [] },
            { id: 'c2', role: 'PRIMARY', personName: null, cards: [{ last4: '2222', closedOn: '2020-01-01' }, { last4: '3333', closedOn: null }] },
            { id: 'c3', role: 'ADDON', personName: '', cards: [{ last4: '4444', closedOn: '2020-01-01' }] },
          ],
        })}
      />
    );
    expect(screen.getByText('Cardholders')).toBeInTheDocument();
    expect(screen.getByText('Asha')).toBeInTheDocument();
    expect(screen.getByText('•••• 1111')).toBeInTheDocument();
    expect(screen.getByText('Primary')).toBeInTheDocument();
    expect(screen.getByText('•••• 3333')).toBeInTheDocument();
    expect(screen.getByText('Add-on')).toBeInTheDocument();
    expect(screen.getByText('No active card')).toBeInTheDocument();
  });

  it('no cardholders section when there are none', () => {
    render(<AccountOverview account={acct({ type: 'credit_card', creditLimit: 1000, balance: 0, cardholders: [] })} />);
    expect(screen.queryByText('Cardholders')).toBeNull();
  });
});
