import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, screen, waitFor } from '@testing-library/react';
import { createElement, type ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('@/components/dashboards/widgets/card_utilisation/CardUtilisationWidget', () => ({
  CardUtilisationWidget: ({ accountId, className }: { accountId?: string | null; className?: string }) => (
    <div data-testid="card-util" data-account={accountId ?? 'none'} className={className} />
  ),
}));
vi.mock('@/components/dashboards/widgets/emergency_fund/EmergencyFundWidget', () => ({
  EmergencyFundWidget: ({ className }: { className?: string }) => <div data-testid="emergency" className={className} />,
}));

import { CARDS_SPENDING_ENTRIES, CARDS_SPENDING_VIEWS } from '@/components/dashboards/builtins/group.cardsSpending';
import { builtinEntry, templateView } from '@/components/dashboards/builtins/registry';
import { DashboardWidgetView } from '@/components/dashboards/DashboardWidgetView';
import { CapHeadroomView } from '@/components/dashboards/widgets/cap_headroom/CapHeadroomView';
import { MilestoneProgressView } from '@/components/dashboards/widgets/milestone_progress/MilestoneProgressView';
import { RewardsEarnedView } from '@/components/dashboards/widgets/rewards_earned/RewardsEarnedView';
import { SpendHeatmapView } from '@/components/dashboards/widgets/spend_heatmap/SpendHeatmapView';
import { api } from '@/lib/api/client';
import type { WidgetResponse } from '@/lib/dashboards.types';
import { useBalanceSeries } from '@/lib/query/hooks/useBalanceSeries';
import { useEmergencyFund } from '@/lib/query/hooks/useEmergencyFund';
import { invalidateMoneyQueries, invalidateRewardQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import { createTestQueryClient, renderWithQuery } from '@/test/renderWithQuery';

import { account, widget } from './cardsSpendingFixtures';

const component = (key: string, params: Record<string, unknown> = {}): WidgetResponse =>
  widget(key, params, {
    builtin: { category: 'cards_rewards', key, label: key, minW: 50, kind: 'component', templateType: null } as WidgetResponse['builtin'],
  });

function subtitle(key: string, w: WidgetResponse) {
  return builtinEntry(key)?.subtitle?.(w) ?? null;
}

beforeEach(() => vi.resetAllMocks());

describe('cards & spending group registration', () => {
  it('registers the four template views under the server view names', () => {
    expect(CARDS_SPENDING_VIEWS).toEqual({
      progress_list: MilestoneProgressView,
      cap_list: CapHeadroomView,
      rewards_fy: RewardsEarnedView,
      heatmap: SpendHeatmapView,
    });
    expect(templateView('heatmap')).toBe(SpendHeatmapView);
  });

  it('component built-ins carry a body; every entry has a phone slot', () => {
    for (const key of ['card_utilisation', 'account_tile', 'emergency_fund']) {
      expect(builtinEntry(key)?.Body).toBeDefined();
    }
    for (const key of ['milestone_progress', 'cap_headroom', 'rewards_earned', 'spend_heatmap']) {
      expect(builtinEntry(key)?.Body).toBeUndefined();
    }
    expect(Object.keys(CARDS_SPENDING_ENTRIES).every((k) => builtinEntry(k)?.phone)).toBe(true);
    expect(builtinEntry('spend_heatmap')?.phone).toEqual({ fit: 'fill', className: 'h-[220px]' });
    expect(builtinEntry('card_utilisation')?.phone).toEqual({ fit: 'content' });
  });

  it('card_utilisation renders its body with the accountId param', () => {
    renderWithQuery(<DashboardWidgetView widget={component('card_utilisation', { accountId: 'c1' })} />);
    expect(screen.getByTestId('card-util')).toHaveAttribute('data-account', 'c1');
    expect(screen.getByTestId('card-util')).toHaveClass('h-full');
  });

  it('emergency_fund renders its body', () => {
    renderWithQuery(<DashboardWidgetView widget={component('emergency_fund')} />);
    expect(screen.getByTestId('emergency')).toBeInTheDocument();
  });

  it('subtitles: card name when a card is picked, else All cards / the server line', async () => {
    expect(subtitle('card_utilisation', component('card_utilisation'))).toBe('All cards');
    expect(subtitle('milestone_progress', widget('milestone_progress'))).toBeNull();
    expect(subtitle('cap_headroom', widget('cap_headroom'))).toBeNull();
    vi.mocked(api.GET).mockResolvedValue({ data: [account({ id: 'c1', name: 'Atlas', type: 'credit_card' })] } as never);
    renderWithQuery(subtitle('cap_headroom', widget('cap_headroom', { accountId: 'c1' })) as ReactElement);
    expect(await screen.findByText('Atlas')).toBeInTheDocument();
  });

  it('subtitles: Last N months for the heatmap; the account type for a tile', async () => {
    expect(subtitle('spend_heatmap', widget('spend_heatmap'))).toBe('Last 6 months');
    expect(subtitle('spend_heatmap', widget('spend_heatmap', { months: 1 }))).toBe('Last 1 month');
    expect(subtitle('account_tile', component('account_tile'))).toBeNull();
    vi.mocked(api.GET).mockResolvedValue({ data: [account({ id: 'b1' })] } as never);
    renderWithQuery(subtitle('account_tile', component('account_tile', { accountId: 'b1' })) as ReactElement);
    expect(await screen.findByText('Bank account')).toBeInTheDocument();
  });
});

describe('hooks', () => {
  const wrapper = (qc: QueryClient) =>
    function W({ children }: { children: React.ReactNode }) {
      return createElement(QueryClientProvider, { client: qc }, children);
    };

  it('useBalanceSeries fetches the asked days under the accounts key; off without an id', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: [{ date: '2026-10-10', balance: 5 }] } as never);
    const qc = createTestQueryClient();
    const { result } = renderHook(() => useBalanceSeries('a1', 7), { wrapper: wrapper(qc) });
    await waitFor(() => expect(result.current.data).toEqual([{ date: '2026-10-10', balance: 5 }]));
    expect(api.GET).toHaveBeenCalledWith('/api/v1/accounts/{id}/balance-series', { params: { path: { id: 'a1' }, query: { days: 7 } } });
    expect(qc.getQueryData(keys.accounts.balanceSeries('a1', 7))).toBeDefined();
    expect(keys.accounts.balanceSeries('a1', 7).slice(0, 1)).toEqual(keys.accounts.all);

    vi.mocked(api.GET).mockClear();
    renderHook(() => useBalanceSeries(''), { wrapper: wrapper(createTestQueryClient()) });
    expect(api.GET).not.toHaveBeenCalled();
  });

  it('useBalanceSeries treats a missing body as no points', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: undefined } as never);
    const { result } = renderHook(() => useBalanceSeries('a1'), { wrapper: wrapper(createTestQueryClient()) });
    await waitFor(() => expect(result.current.data).toEqual([]));
  });

  it('useEmergencyFund reads GET /insights/emergency-fund under the insights key', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: { liquidBalance: 1 } } as never);
    const qc = createTestQueryClient();
    const { result } = renderHook(() => useEmergencyFund(), { wrapper: wrapper(qc) });
    await waitFor(() => expect(result.current.data).toEqual({ liquidBalance: 1 }));
    expect(api.GET).toHaveBeenCalledWith('/api/v1/insights/emergency-fund');
    expect(keys.insights.emergencyFund()).toEqual(['insights', 'emergencyFund']);
  });
});

describe('invalidation helpers', () => {
  it('money changes refresh balances (and series), the emergency fund and widget data', async () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    await invalidateMoneyQueries(qc);
    expect(spy.mock.calls.map(([f]) => f?.queryKey)).toEqual([
      keys.accounts.all,
      keys.insights.all,
      [...keys.dashboards.all, 'widget'],
    ]);
  });

  it('reward changes refresh the Rewards page and widget data', async () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    await invalidateRewardQueries(qc);
    expect(spy.mock.calls.map(([f]) => f?.queryKey)).toEqual([keys.rewards.all, [...keys.dashboards.all, 'widget']]);
  });

  it('a widget data key is under the invalidated prefix', () => {
    const key = keys.dashboards.widget('w1', { a: 1 });
    expect(key.slice(0, 2)).toEqual([...keys.dashboards.all, 'widget']);
  });
});

