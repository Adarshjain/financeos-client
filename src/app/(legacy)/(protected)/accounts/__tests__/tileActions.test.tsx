import '@/test/next-mocks';

import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithQuery } from '@/test/renderWithQuery';

import { BankAccountTile } from '../components/BankAccountTile';
import { BrokerTile } from '../components/BrokerTile';
import { CreditCardTile } from '../components/CreditCardTile';
import { GenericAccountTile } from '../components/GenericAccountTile';

const common = {
  excludeFromNetAsset: false,
  financialPosition: 'asset',
  closedOn: null,
  balanceAnchored: false,
  reconciliationGap: null,
  anchorDate: null,
  warnings: [],
};

const wallet = {
  ...common,
  id: 'g1',
  name: 'Petty Cash',
  type: 'generic',
  description: 'Drawer cash',
  balance: 1200,
};

const broker = {
  ...common,
  id: 'b1',
  name: 'Zerodha Demat',
  type: 'broker',
  provider: 'Zerodha',
  clientId: 'ZR1234',
  cashBalance: 500,
  balance: 10500,
};

const bank = {
  ...common,
  id: 'bank-1',
  name: 'HDFC Salary Account',
  type: 'bank_account',
  description: null,
  ingestFromDate: null,
  last4: '4321',
  openingBalance: 10000,
  lastStatementDate: null,
  balance: 15000,
};

const card = {
  ...common,
  id: 'cc-1',
  name: 'Random Card',
  type: 'credit_card',
  description: null,
  ingestFromDate: null,
  last4: '5554',
  creditLimit: 2000000,
  anniversaryDate: '2026-08-01',
  lastStatementDate: null,
  balance: 0,
  cardholders: [],
};

describe('account tile actions row', () => {
  it('Wallet/Cash tile has no Statements or Cards action and no sync watermark', () => {
    renderWithQuery(<GenericAccountTile account={wallet as any} />);

    expect(screen.getByText('Petty Cash')).toBeInTheDocument();
    expect(screen.getByText('Balance')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Statements/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Cards/i })).toBeNull();
    expect(screen.queryByText(/Gmail Sync Watermark/i)).toBeNull();
  });

  it('Broker tile has no Statements or Cards action', () => {
    renderWithQuery(<BrokerTile account={broker as any} />);

    expect(screen.getByText('Zerodha Demat')).toBeInTheDocument();
    expect(screen.getByText('Portfolio Value')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Statements/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Cards/i })).toBeNull();
  });

  it('Bank tile keeps both Statements and Cards actions', () => {
    renderWithQuery(<BankAccountTile account={bank as any} />);

    expect(screen.getByRole('button', { name: /Statements/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cards/i })).toBeInTheDocument();
  });

  it('Credit card tile keeps both Statements and Cards actions', () => {
    renderWithQuery(<CreditCardTile account={card as any} />);

    expect(screen.getByRole('button', { name: /Statements/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cards/i })).toBeInTheDocument();
  });
});
