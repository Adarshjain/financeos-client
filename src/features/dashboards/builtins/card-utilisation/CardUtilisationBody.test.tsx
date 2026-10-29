import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The actions run in-process here and reach the API through the same mocked `api` these tests already drive.
vi.mock('@/lib/api/server', async () => ({ serverApi: (await import('@/lib/api/client')).api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ unstable_rethrow: (e: unknown) => { throw e; }, useRouter: () => ({ push, refresh: vi.fn() }) }));

import { account, bodyProps, card, NOW } from '@/features/dashboards/builtins/testFixtures';
import type { Account } from '@/lib/account.types';
import { api, ApiError } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

import { CardUtilisationBody } from './CardUtilisationBody';

const accounts = [
  card({ id: 'c-low', name: 'Low Card', balance: -10000, utilizationPct: 10 }),
  card({ id: 'c-high', name: 'High Card', balance: -80000, utilizationPct: 80 }),
  card({ id: 'c-mid', name: 'Mid Card', balance: -45000, utilizationPct: 45 }),
  card({ id: 'c-nolimit', name: 'No Limit Card', balance: -900, creditLimit: 0, effectiveCreditLimit: null, utilizationPct: null }),
  card({ id: 'c-closed', name: 'Closed Card', balance: -5000, utilizationPct: 5, closedOn: '2026-01-01' }),
  account({ id: 'bank', name: 'Bank', balance: 5000 }),
] as unknown as Account[];

describe('CardUtilisationBody', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it('shows the loading rows while the accounts load', () => {
    vi.mocked(api.GET).mockReturnValue(new Promise(() => {}) as never);
    renderWithQuery(<CardUtilisationBody {...bodyProps('card_utilisation')} />);
    expect(screen.getByTestId('widget-skeleton')).toBeInTheDocument();
  });

  it('names what failed and retries', async () => {
    vi.mocked(api.GET).mockRejectedValueOnce(new ApiError(500, { code: 'X', message: 'Server down' }));
    vi.mocked(api.GET).mockResolvedValue({ data: accounts } as never);
    renderWithQuery(<CardUtilisationBody {...bodyProps('card_utilisation')} />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't load this widget");
    expect(alert).toHaveTextContent('Server down');
    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findAllByTestId('utilisation-row')).toHaveLength(4);
  });

  it('rows by percent descending with the flag, the owed line and the overall row; closed cards left out', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: accounts } as never);
    renderWithQuery(<CardUtilisationBody {...bodyProps('card_utilisation')} />);
    const rows = await screen.findAllByTestId('utilisation-row');
    expect(rows.map((r) => r.getAttribute('data-account-id'))).toEqual(['c-high', 'c-mid', 'c-low', 'c-nolimit']);
    expect(within(rows[0]).getByText('80%')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Over 30%')).toBeInTheDocument();
    expect(within(rows[2]).queryByText('Over 30%')).not.toBeInTheDocument();
    expect(rows[2]).toHaveTextContent('₹10,000 owed of ₹1,00,000');
    expect(rows[3]).toHaveTextContent('no limit set');
    expect(within(rows[3]).getByText('—')).toBeInTheDocument();
    expect(screen.getByTestId('utilisation-overall')).toHaveTextContent('All cards');
    expect(screen.getByTestId('utilisation-overall')).toHaveTextContent('₹1,35,000 owed of ₹3,00,000');
    expect(screen.queryByText('Closed Card')).not.toBeInTheDocument();
  });

  it('accountId narrows to that card with no overall row', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: accounts } as never);
    renderWithQuery(<CardUtilisationBody {...bodyProps('card_utilisation', { accountId: 'c-mid' })} />);
    expect(await screen.findAllByTestId('utilisation-row')).toHaveLength(1);
    expect(screen.queryByTestId('utilisation-overall')).not.toBeInTheDocument();
  });

  it('a picked card that is closed or gone says so', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: accounts } as never);
    renderWithQuery(<CardUtilisationBody {...bodyProps('card_utilisation', { accountId: 'c-closed' })} />);
    expect(await screen.findByText('This card is closed or no longer exists.')).toBeInTheDocument();
  });

  it('no open cards: an empty state that goes to accounts', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: [account({})] } as never);
    renderWithQuery(<CardUtilisationBody {...bodyProps('card_utilisation')} />);
    expect(await screen.findByText("Add a credit card to see how much of its limit you're using.")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to accounts' })).toHaveAttribute('href', expect.stringMatching(/\/accounts$/));
  });
});
