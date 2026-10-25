import { screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadHome = vi.hoisted(() => vi.fn());
vi.mock('@/features/dashboards/home/homeData', () => ({ loadHome }));
vi.mock('@/features/dashboards/home/HomeScreen', () => ({
  HomeScreen: (props: { displayName?: string | null; needsYou?: number; lastSyncedAt?: string; nowIso: string }) => (
    <div data-testid="home" data-name={props.displayName} data-needs={props.needsYou} data-sync={props.lastSyncedAt} data-now={props.nowIso} />
  ),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), usePathname: () => '/ds/dashboard', useSearchParams: () => new URLSearchParams() }));
vi.mock('@/features/notifications/useNotificationsAction', () => ({ useNotificationsAction: () => ({ id: 'notifications', icon: 'notifications', label: 'Notifications' }) }));

import { dehydrate, QueryClient } from '@tanstack/react-query';

import { renderWithQuery } from '@/test/renderWithQuery';

import DsHomeLoading from './loading';
import DsHomePage from './page';

beforeEach(() => vi.clearAllMocks());

describe('/ds/dashboard (Home)', () => {
  it('loads everything once on the server and hands the name, the sync time and the clock to the screen', async () => {
    loadHome.mockResolvedValue({
      ok: true,
      data: { state: dehydrate(new QueryClient()), displayName: 'Arjun Mehta', needsYou: 2, lastSyncedAt: '2026-10-13T06:56:00Z', now: '2026-10-13T07:00:00Z' },
    });
    renderWithQuery(await DsHomePage());
    expect(loadHome).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('home')).toHaveAttribute('data-name', 'Arjun Mehta');
    expect(screen.getByTestId('home')).toHaveAttribute('data-needs', '2');
    expect(screen.getByTestId('home')).toHaveAttribute('data-sync', '2026-10-13T06:56:00Z');
    expect(screen.getByTestId('home')).toHaveAttribute('data-now', '2026-10-13T07:00:00Z');
  });

  it('says Home could not load, with Try again', async () => {
    loadHome.mockResolvedValue({ ok: false });
    renderWithQuery(await DsHomePage());
    expect(screen.getByText('Could not load dashboards')).toBeInTheDocument();
  });

  it('shows the greeting’s shape while it loads', () => {
    renderWithQuery(<DsHomeLoading />);
    expect(screen.getByText('Home')).toBeInTheDocument();
  });
});
