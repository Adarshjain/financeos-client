import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { formatMoney } from '@/lib/utils';

import { AccountOverview } from '../AccountOverview';

const hdfc = {
  id: 'p-hdfc',
  name: 'HDFC cards',
  creditLimit: 500000,
  owed: 150000,
  available: 350000,
  utilizationPct: 30,
  memberCount: 3,
  openMemberCount: 3,
};

const card = (o: Record<string, unknown>) =>
  ({
    id: 'c1',
    name: 'Regalia',
    type: 'credit_card',
    warnings: [],
    effectiveCreditLimit: 500000,
    utilizationPct: 30,
    creditLimit: null,
    limitPool: hdfc,
    ...o,
  }) as never;

describe('AccountOverview shared limit', () => {
  it('a pooled card shows the shared limit, who shares it and what is left of it', () => {
    render(<AccountOverview account={card({})} />);

    expect(screen.getByText('Shared credit limit')).toBeInTheDocument();
    expect(screen.queryByText('Credit limit')).toBeNull();
    expect(screen.getByText(formatMoney(500000))).toBeInTheDocument();
    expect(screen.getByText('Shared with')).toBeInTheDocument();
    expect(screen.getByText('HDFC cards · 3 accounts')).toBeInTheDocument();
    expect(screen.getByText('Shared limit available')).toBeInTheDocument();
    expect(screen.getByText(formatMoney(350000))).toBeInTheDocument();
    expect(screen.queryByText('Own limit')).toBeNull();
  });

  it("a pooled card's own cap is listed when set", () => {
    render(<AccountOverview account={card({ creditLimit: 100000, limitPool: { ...hdfc, memberCount: 1 } })} />);

    expect(screen.getByText('HDFC cards · 1 account')).toBeInTheDocument();
    expect(screen.getByText('Own limit')).toBeInTheDocument();
    expect(screen.getByText(formatMoney(100000))).toBeInTheDocument();
  });

  it('an unpooled card has none of the shared-limit rows', () => {
    render(<AccountOverview account={card({ limitPool: null, creditLimit: 100000, effectiveCreditLimit: 100000 })} />);

    expect(screen.getByText('Credit limit')).toBeInTheDocument();
    expect(screen.queryByText('Shared with')).toBeNull();
    expect(screen.queryByText('Shared limit available')).toBeNull();
  });
});
