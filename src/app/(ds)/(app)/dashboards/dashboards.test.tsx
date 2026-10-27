import { screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadDashboardPage = vi.hoisted(() => vi.fn());
vi.mock('@/features/dashboards/dashboardData', () => ({ loadDashboardPage }));
vi.mock('@/features/dashboards/view/DashboardScreen', () => ({
  DashboardScreen: ({ dashboard, startEditing }: { dashboard?: { name: string }; startEditing?: boolean }) => (
    <div data-testid="screen" data-editing={String(Boolean(startEditing))}>
      {dashboard?.name ?? 'new'}
    </div>
  ),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), usePathname: () => '/dashboards/d1', useSearchParams: () => new URLSearchParams() }));
vi.mock('@/features/notifications/useNotificationsAction', () => ({ useNotificationsAction: () => ({ id: 'notifications', icon: 'notifications', label: 'Notifications' }) }));

import { dehydrate, QueryClient } from '@tanstack/react-query';

import { renderWithQuery } from '@/test/renderWithQuery';

import DashboardLoading from './[id]/loading';
import DashboardNotFound from './[id]/not-found';
import DsDashboardPage from './[id]/page';
import NewLoading from './new/loading';
import NewDashboardPage from './new/page';

const state = dehydrate(new QueryClient());

beforeEach(() => {
  vi.clearAllMocks();
  loadDashboardPage.mockResolvedValue({ dashboard: { name: 'Money overview' }, state });
});

const params = (id = 'd1') => Promise.resolve({ id });

describe('/dashboards/[id]', () => {
  it('loads the dashboard once, on the server, before the first render', async () => {
    renderWithQuery(await DsDashboardPage({ params: params(), searchParams: Promise.resolve({}) }));
    expect(loadDashboardPage).toHaveBeenCalledTimes(1);
    expect(loadDashboardPage).toHaveBeenCalledWith('d1');
    expect(screen.getByTestId('screen')).toHaveTextContent('Money overview');
    expect(screen.getByTestId('screen')).toHaveAttribute('data-editing', 'false');
  });

  it('opens editing from ?edit=1, read on the server so the first render has it', async () => {
    renderWithQuery(await DsDashboardPage({ params: params(), searchParams: Promise.resolve({ edit: '1' }) }));
    expect(screen.getByTestId('screen')).toHaveAttribute('data-editing', 'true');
  });

  it('ignores any other value of edit', async () => {
    renderWithQuery(await DsDashboardPage({ params: params(), searchParams: Promise.resolve({ edit: '0' }) }));
    expect(screen.getByTestId('screen')).toHaveAttribute('data-editing', 'false');
  });

  it('says the dashboard is not found, with a way back', () => {
    renderWithQuery(<DashboardNotFound />);
    expect(screen.getByText('Dashboard not found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to Dashboards' })).toBeInTheDocument();
  });

  it('shows the dashboard\'s shape while it loads', () => {
    renderWithQuery(<DashboardLoading />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});

describe('/dashboards/new', () => {
  it('opens the editor on an empty draft, loading the catalog and reports on the server', async () => {
    loadDashboardPage.mockResolvedValue({ state });
    renderWithQuery(await NewDashboardPage());
    expect(loadDashboardPage).toHaveBeenCalledWith();
    expect(screen.getByTestId('screen')).toHaveTextContent('new');
  });

  it('shows the editor\'s shape while it loads', () => {
    renderWithQuery(<NewLoading />);
    expect(screen.getByText('New dashboard')).toBeInTheDocument();
  });
});
