import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { api, ApiError } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

import { account, bodyProps, card, NOW } from '../testFixtures';
import { AccountTileBody } from './AccountTileBody';

function serve(value: unknown) {
  vi.mocked(api.GET).mockImplementation((() =>
    value instanceof Error ? Promise.reject(value) : Promise.resolve({ data: value })) as never);
}

describe('AccountTileBody', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it('without an account it asks for one', () => {
    renderWithQuery(<AccountTileBody {...bodyProps('account_tile')} />);
    expect(screen.getByText('Pick an account in Widget settings.')).toBeInTheDocument();
    expect(api.GET).not.toHaveBeenCalled();
  });

  it('shows the loading shape while the account loads', () => {
    vi.mocked(api.GET).mockReturnValue(new Promise(() => {}) as never);
    renderWithQuery(<AccountTileBody {...bodyProps('account_tile', { accountId: 'a1' })} />);
    expect(screen.getByTestId('widget-skeleton')).toBeInTheDocument();
  });

  it('a bank account: its name, "Balance" and the figure', async () => {
    serve(account({ id: 'a1', name: 'HDFC Savings', balance: 125000 }));
    renderWithQuery(<AccountTileBody {...bodyProps('account_tile', { accountId: 'a1' })} />);
    const tile = await screen.findByTestId('account-tile');
    expect(tile).toHaveTextContent('HDFC Savings');
    expect(tile).toHaveTextContent('Balance');
    expect(tile).toHaveTextContent('₹1,25,000');
  });

  it('a card shows what it owes as a positive amount, or "In credit"', async () => {
    serve(card({ id: 'a1', name: 'Amex', balance: -33900 }));
    const { unmount } = renderWithQuery(<AccountTileBody {...bodyProps('account_tile', { accountId: 'a1' })} />);
    expect(await screen.findByTestId('account-tile')).toHaveTextContent('You owe₹33,900');
    unmount();
    serve(card({ id: 'a1', name: 'Amex', balance: 1200 }));
    renderWithQuery(<AccountTileBody {...bodyProps('account_tile', { accountId: 'a1' })} />);
    expect(await screen.findByTestId('account-tile')).toHaveTextContent('In credit₹1,200');
  });

  it('a deleted account says so; any other failure names it and offers Retry', async () => {
    serve(new ApiError(404, { code: 'NOT_FOUND', message: 'gone' }));
    const { unmount } = renderWithQuery(<AccountTileBody {...bodyProps('account_tile', { accountId: 'a1' })} />);
    expect(await screen.findByText('This account no longer exists.')).toBeInTheDocument();
    unmount();
    serve(new ApiError(500, { code: 'X', message: 'Server down' }));
    renderWithQuery(<AccountTileBody {...bodyProps('account_tile', { accountId: 'a1' })} />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Server down');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
