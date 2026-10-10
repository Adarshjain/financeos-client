import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('@/components/reports/underlying/RowBreakdownDialog', () => ({
  RowBreakdownDialog: ({ onOpenChange, ...p }: { onOpenChange: (o: boolean) => void }) => (
    <div data-testid="breakdown-dialog" data-props={JSON.stringify(p)}>
      <button onClick={() => onOpenChange(false)}>close dialog</button>
    </div>
  ),
}));

import { buildUtilisationModel, cardOwed } from '@/components/dashboards/widgets/card_utilisation/cardUtilisation.model';
import { CardUtilisationWidget } from '@/components/dashboards/widgets/card_utilisation/CardUtilisationWidget';
import type { Account } from '@/lib/account.types';
import { api, ApiError } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

import { account, card, dialogProps, NOW, TODAY } from './cardsSpendingFixtures';

const accounts = [
  card({ id: 'c-low', name: 'Low Card', balance: -10000, utilizationPct: 10 }),
  card({ id: 'c-high', name: 'High Card', balance: -80000, utilizationPct: 80 }),
  card({ id: 'c-mid', name: 'Mid Card', balance: -45000, utilizationPct: 45 }),
  card({ id: 'c-closed', name: 'Closed Card', balance: -5000, utilizationPct: 5, closedOn: '2026-01-01' }),
  account({ id: 'bank', name: 'Bank', balance: 5000 }),
] as unknown as Account[];

describe('buildUtilisationModel', () => {
  it('lists open cards only, most utilised first, flagging 30% and over', () => {
    const m = buildUtilisationModel(accounts, null, TODAY);
    expect(m.rows.map((r) => r.id)).toEqual(['c-high', 'c-mid', 'c-low']);
    expect(m.rows.map((r) => r.flagged)).toEqual([true, true, false]);
  });

  it('a card closing in the future still counts', () => {
    const m = buildUtilisationModel([card({ id: 'x', closedOn: '2026-12-01', utilizationPct: 1 })] as unknown as Account[], null, TODAY);
    expect(m.rows).toHaveLength(1);
  });

  it('overall = sum owed ÷ sum limits, only with more than one card', () => {
    const m = buildUtilisationModel(accounts, null, TODAY);
    expect(m.overall).toEqual({ owed: 135000, limit: 300000, pct: 45 });
    expect(buildUtilisationModel(accounts, 'c-mid', TODAY).overall).toBeNull();
  });

  it('a card in credit owes nothing (not "utilised")', () => {
    expect(cardOwed(2500)).toBe(0);
    expect(cardOwed(-2500)).toBe(2500);
    expect(cardOwed(null)).toBe(0);
    const m = buildUtilisationModel([card({ id: 'x', balance: 3000, utilizationPct: 0 })] as unknown as Account[], null, TODAY);
    expect(m.rows[0].owed).toBe(0);
  });

  it('uses the server\'s effective limit (the statement limit when the card has none), never one back-computed from the percent; no limit sorts last', () => {
    const m = buildUtilisationModel(
      [
        card({ id: 'nolimit', name: 'A', creditLimit: 0, effectiveCreditLimit: null, balance: -1000, utilizationPct: null }),
        card({ id: 'stmt', name: 'B', creditLimit: 0, effectiveCreditLimit: 50000, balance: -20000, utilizationPct: 40 }),
      ] as unknown as Account[],
      null,
      TODAY,
    );
    expect(m.rows.map((r) => [r.id, r.limit])).toEqual([['stmt', 50000], ['nolimit', null]]);
    // The card without a limit is left out of the overall ratio.
    expect(m.overall).toEqual({ owed: 20000, limit: 50000, pct: 40 });
  });
});

describe('buildUtilisationModel — effective limits', () => {
  it('overall = Σ owed ÷ Σ effective limits over the cards that have one (a rounded percent never skews it)', () => {
    const m = buildUtilisationModel(
      [
        // 33.3% of 30,000 would back-compute to 30,030; the server's limit is used as is.
        card({ id: 'a', name: 'A', creditLimit: 30000, effectiveCreditLimit: 30000, balance: -10000, utilizationPct: 33.3 }),
        card({ id: 'b', name: 'B', creditLimit: 0, effectiveCreditLimit: 70000, balance: -20000, utilizationPct: 28.6 }),
        card({ id: 'c', name: 'C', creditLimit: 0, effectiveCreditLimit: null, balance: -5000, utilizationPct: null }),
      ] as unknown as Account[],
      null,
      TODAY,
    );
    expect(m.rows.map((r) => [r.id, r.limit])).toEqual([['a', 30000], ['b', 70000], ['c', null]]);
    expect(m.overall).toEqual({ owed: 30000, limit: 100000, pct: 30 });
  });
});

describe('CardUtilisationWidget', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it('renders a skeleton while the accounts load', () => {
    vi.mocked(api.GET).mockReturnValue(new Promise(() => {}) as never);
    renderWithQuery(<CardUtilisationWidget />);
    expect(screen.getByTestId('widget-skeleton')).toBeInTheDocument();
  });

  it('shows an error when the accounts fail', async () => {
    vi.mocked(api.GET).mockRejectedValue(new ApiError(500, { code: 'X', message: 'Server down' }));
    renderWithQuery(<CardUtilisationWidget />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Server down');
  });

  it('rows by % desc with tone, flag, owed and limit, plus the overall row', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: accounts } as never);
    renderWithQuery(<CardUtilisationWidget />);
    const rows = await screen.findAllByTestId('utilisation-row');
    expect(rows.map((r) => r.getAttribute('data-account-id'))).toEqual(['c-high', 'c-mid', 'c-low']);
    expect(within(rows[0]).getByText('80.0%')).toHaveClass('text-rose-600');
    expect(within(rows[0]).getByText('Over 30%')).toBeInTheDocument();
    expect(within(rows[1]).getByText('45.0%')).toHaveClass('text-amber-600');
    expect(within(rows[2]).queryByText('Over 30%')).not.toBeInTheDocument();
    expect(within(rows[2]).getByText('₹10,000.00')).toBeInTheDocument();
    expect(within(rows[2]).getByText('of ₹1,00,000.00')).toBeInTheDocument();
    const overall = screen.getByTestId('utilisation-overall');
    expect(overall).toHaveTextContent('All cards ₹1,35,000.00 of ₹3,00,000.00');
    expect(within(overall).getByText('45.0%')).toBeInTheDocument();
    expect(screen.queryByText('Closed Card')).not.toBeInTheDocument();
  });

  it('accountId narrows to that card with no overall row', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: accounts } as never);
    renderWithQuery(<CardUtilisationWidget accountId="c-mid" />);
    expect(await screen.findAllByTestId('utilisation-row')).toHaveLength(1);
    expect(screen.queryByTestId('utilisation-overall')).not.toBeInTheDocument();
  });

  it('a picked card that is closed or gone says so', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: accounts } as never);
    renderWithQuery(<CardUtilisationWidget accountId="c-closed" />);
    expect(await screen.findByText('This card is closed or no longer exists.')).toBeInTheDocument();
  });

  it('no open cards: an empty state linking to accounts', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: [account({})] } as never);
    renderWithQuery(<CardUtilisationWidget />);
    expect(await screen.findByText('No open credit cards')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to accounts' })).toHaveAttribute('href', '/accounts');
  });

  it("tapping a card's owed opens its net-worth breakdown", async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: accounts } as never);
    renderWithQuery(<CardUtilisationWidget />);
    await userEvent.click(await screen.findByRole('button', { name: /— view Mid Card balance breakdown$/ }));
    expect(dialogProps(await screen.findByTestId('breakdown-dialog'))).toEqual({
      datasource: 'net_worth', rowId: 'c-mid', title: 'Mid Card', open: true,
    });
    await userEvent.click(screen.getByText('close dialog'));
    expect(screen.queryByTestId('breakdown-dialog')).not.toBeInTheDocument();
  });
});
