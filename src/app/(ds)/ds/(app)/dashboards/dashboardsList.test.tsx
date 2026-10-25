import { screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadDashboardsList = vi.hoisted(() => vi.fn());
vi.mock('@/features/dashboards/list/dashboardsListData', () => ({ loadDashboardsList }));
vi.mock('@/features/dashboards/list/DashboardsScreen', () => ({
  DashboardsScreen: () => <div data-testid="screen">list</div>,
  DashboardsListSkeleton: () => <div data-testid="skeleton" />,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), usePathname: () => '/ds/dashboards', useSearchParams: () => new URLSearchParams() }));
vi.mock('@/features/notifications/useNotificationsAction', () => ({ useNotificationsAction: () => ({ id: 'notifications', icon: 'notifications', label: 'Notifications' }) }));

import { dehydrate, QueryClient } from '@tanstack/react-query';

import { renderWithQuery } from '@/test/renderWithQuery';

import DsDashboardsLayout from './(list)/layout';
import DsDashboardsLoading from './(list)/loading';
import DsDashboardsPage from './(list)/page';

beforeEach(() => vi.clearAllMocks());

describe('/ds/dashboards', () => {
  it('loads the list once, on the server, before the first render', async () => {
    loadDashboardsList.mockResolvedValue({ ok: true, data: dehydrate(new QueryClient()) });
    renderWithQuery(await DsDashboardsPage());
    expect(loadDashboardsList).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('screen')).toBeInTheDocument();
  });

  it('says the list could not load, with Try again and the reference', async () => {
    loadDashboardsList.mockResolvedValue({ ok: false, reference: 'ref-9' });
    renderWithQuery(await DsDashboardsPage());
    expect(screen.getByText('Could not load dashboards')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByText(/ref-9/)).toBeInTheDocument();
  });

  it('the + in the top bar is New dashboard', () => {
    renderWithQuery(<DsDashboardsLayout>body</DsDashboardsLayout>);
    expect(screen.getByRole('link', { name: 'New dashboard' })).toHaveAttribute('href', '/ds/dashboards/new');
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  it('shows the skeleton while it loads', () => {
    renderWithQuery(<DsDashboardsLoading />);
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });
});
