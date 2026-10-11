import '@/test/next-mocks';

import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { formatMoney } from '@/lib/utils';
import { renderWithQuery } from '@/test/renderWithQuery';

import { CreditCardTile } from '../components/CreditCardTile';

const hdfc = {
  id: 'p-hdfc',
  name: 'HDFC cards',
  creditLimit: 500000,
  owed: 150000,
  available: 350000,
  utilizationPct: 30,
  memberCount: 2,
  openMemberCount: 2,
};

const card = (over: Record<string, unknown>) =>
  ({
    id: 'c1',
    name: 'HDFC Regalia',
    type: 'credit_card',
    last4: '1234',
    creditLimit: null,
    effectiveCreditLimit: 500000,
    utilizationPct: 30,
    balance: -100000,
    excludeFromNetAsset: false,
    financialPosition: 'liability',
    closedOn: null,
    balanceAnchored: false,
    anchorDate: null,
    reconciliationGap: null,
    warnings: [],
    limitPool: hdfc,
    ...over,
  }) as never;

describe('CreditCardTile shared limit', () => {
  it('a pooled card shows the shared limit with the pool name and how many accounts share it', () => {
    renderWithQuery(<CreditCardTile account={card({})} />);

    expect(screen.getByText('Shared Limit')).toBeInTheDocument();
    expect(screen.queryByText('Credit Limit')).toBeNull();
    expect(screen.getByText(formatMoney(500000))).toBeInTheDocument();
    expect(screen.getByText('HDFC cards · 2 accounts')).toBeInTheDocument();
    expect(screen.getByText('30.0%')).toBeInTheDocument();
  });

  it("a pooled card with its own cap shows the cap, and a pool of one says 'account'", () => {
    renderWithQuery(<CreditCardTile account={card({ creditLimit: 100000, limitPool: { ...hdfc, memberCount: 1 } })} />);

    expect(screen.getByText(`HDFC cards · 1 account · own cap ${formatMoney(100000)}`)).toBeInTheDocument();
  });

  it('an unpooled card keeps the Credit Limit label and has no shared-limit note', () => {
    renderWithQuery(<CreditCardTile account={card({ limitPool: null, creditLimit: 100000, effectiveCreditLimit: 100000 })} />);

    expect(screen.getByText('Credit Limit')).toBeInTheDocument();
    expect(screen.queryByText('Shared Limit')).toBeNull();
    expect(screen.queryByText(/HDFC cards/)).toBeNull();
  });
});
