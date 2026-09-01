import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/apiClient', () => ({
  accountsApi: { list: vi.fn() },
}));

import { accountsApi } from '@/lib/apiClient';

import AccountsPage from '../page';

/** Verbatim shapes from GET /api/v1/accounts on the running server. */
const randomCard = {
  id: 'bf9060b1-4fc5-4a35-bf63-612573a16e30',
  name: 'Random Card',
  type: 'credit_card',
  excludeFromNetAsset: false,
  financialPosition: 'asset',
  description: null,
  closedOn: null,
  ingestFromDate: null,
  last4: '5554',
  creditLimit: 2000000,
  anniversaryDate: '2026-08-01',
  lastStatementDate: null,
  balance: 0,
  balanceAnchored: false,
  reconciliationGap: null,
  anchorDate: null,
  warnings: [],
  cardholders: [
    {
      id: 'efde1c4a', accountId: 'bf9060b1', role: 'ADDON', personName: null, relationship: 'SPOUSE',
      spendLimit: null, openedOn: null, closedOn: null, effectiveClosedOn: null,
      cards: [{ id: '9162f0e4', cardholderId: 'efde1c4a', last4: '9894', issuedOn: null, closedOn: null }],
    },
    {
      id: '155f20c9', accountId: 'bf9060b1', role: 'PRIMARY', personName: null, relationship: 'SELF',
      spendLimit: null, openedOn: '2026-08-01', closedOn: null, effectiveClosedOn: null,
      cards: [
        { id: '69c051be', cardholderId: '155f20c9', last4: '5554', issuedOn: '2026-08-30', closedOn: null },
        { id: '19aca5fa', cardholderId: '155f20c9', last4: '8695', issuedOn: '2026-08-01', closedOn: '2026-08-30' },
      ],
    },
  ],
};

// financialPosition is null on this one, unlike the first — that difference is deliberate.
const cashCard = {
  ...randomCard,
  id: '26e9fb44', name: 'TEST Cash Card', financialPosition: null,
  last4: '0001', creditLimit: 200000, balance: -274016,
  anniversaryDate: '2026-04-10',
  cardholders: [randomCard.cardholders[1]],
};

describe('AccountsPage credit card tile — real payload, real child components', () => {
  it('renders each tile body, not just the Statements/Cards footer', async () => {
    vi.mocked(accountsApi.list).mockResolvedValue([randomCard, cashCard] as never);

    render(await AccountsPage());

    expect(screen.getByText('Random Card')).toBeInTheDocument();
    expect(screen.getByText('TEST Cash Card')).toBeInTheDocument();
    expect(screen.getAllByText('Credit Limit')).toHaveLength(2);
    expect(screen.getAllByText('Balance')).toHaveLength(2);
    expect(screen.getByText('2 cardholders')).toBeInTheDocument();
  });

  it('puts closed accounts in a per-section collapsible, not behind a toggle', async () => {
    const closedCard = { ...cashCard, id: 'closed1', name: 'Old Regalia', closedOn: '2026-01-15' };
    vi.mocked(accountsApi.list).mockResolvedValue([randomCard, closedCard] as never);

    render(await AccountsPage());

    // open card in the grid, closed one inside the details element
    expect(screen.getByText('Random Card')).toBeInTheDocument();
    expect(screen.getByText('Closed (1)')).toBeInTheDocument();
    const closedTile = screen.getByText('Old Regalia');
    expect(closedTile.closest('details')).not.toBeNull();
    // no global toggle anywhere
    expect(screen.queryByText(/Show Closed/i)).toBeNull();
    // closed card's limit is excluded from the section total (only Random Card's 20L)
    expect(screen.getByText(/Total Limit/)).toHaveTextContent('20,00,000');
  });
});
