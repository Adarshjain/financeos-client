import { screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadHome = vi.hoisted(() => vi.fn());
vi.mock('@/features/dashboards/home/homeData', () => ({ loadHome }));
vi.mock('@/features/dashboards/home/HomeScreen', () => ({
  HomeScreen: () => <div data-testid="home" />,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), usePathname: () => '/dashboard', useSearchParams: () => new URLSearchParams() }));
vi.mock('@/features/notifications/useNotificationsAction', () => ({ useNotificationsAction: () => ({ id: 'notifications', icon: 'notifications', label: 'Notifications' }) }));

import { dehydrate, QueryClient } from '@tanstack/react-query';

import { renderWithQuery } from '@/test/renderWithQuery';

import DsHomeLoading from './loading';
import DsHomePage from './page';

beforeEach(() => vi.clearAllMocks());

describe('/dashboard (Home)', () => {
  it('loads the dashboards once on the server and renders the screen with no greeting props', async () => {
    loadHome.mockResolvedValue({ ok: true, data: { state: dehydrate(new QueryClient()) } });
    renderWithQuery(await DsHomePage());
    expect(loadHome).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('home')).toBeInTheDocument();
  });

  it('says Home could not load, with Try again', async () => {
    loadHome.mockResolvedValue({ ok: false });
    renderWithQuery(await DsHomePage());
    expect(screen.getByText('Could not load dashboards')).toBeInTheDocument();
  });

  it('shows the widgets’ shape while it loads', () => {
    renderWithQuery(<DsHomeLoading />);
    expect(screen.getByText('Home')).toBeInTheDocument();
  });
});
