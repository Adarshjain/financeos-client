'use server';

import { serverApi } from '@/lib/api/server';
import type { DashboardResponse, UpdateDashboardRequest } from '@/lib/api/types';
import { AppError } from '@/lib/appError';
import { toDashboardWidget } from '@/lib/dashboards.helpers';
import type { BuiltinWidgetResponse } from '@/lib/dashboards.types';
import { createDomainAction } from '@/lib/domainApi';

export const loadDashboards = createDomainAction(
  { fallbackError: "Couldn't load dashboards. Try again." },
  async (): Promise<DashboardResponse[]> => {
    const { data } = await serverApi.GET('/api/v1/dashboards');
    return data ?? [];
  },
);

export const loadDashboard = createDomainAction(
  { fallbackError: "Couldn't load the dashboard. Try again." },
  async (id: string): Promise<DashboardResponse | null> => {
    const { data } = await serverApi.GET('/api/v1/dashboards/{id}', { params: { path: { id } } });
    return data ?? null;
  },
);

/** The built-in dashboard widget catalog. */
export const loadBuiltins = createDomainAction(
  { fallbackError: "Couldn't load the widget catalog. Try again." },
  async (): Promise<BuiltinWidgetResponse[]> => {
    const { data } = await serverApi.GET('/api/v1/dashboards/builtins');
    return (data ?? []) as BuiltinWidgetResponse[];
  },
);

/** Mints a fresh "Home" dashboard and makes it the default. */
export const restoreHomeDashboard = createDomainAction(
  { fallbackError: 'Failed to restore Home' },
  async (): Promise<DashboardResponse> => {
    const { data } = await serverApi.POST('/api/v1/dashboards/home/restore');
    return data as DashboardResponse;
  },
);

export const saveDashboard = createDomainAction(
  { fallbackError: 'Failed to save dashboard' },
  async (id: string, body: UpdateDashboardRequest): Promise<DashboardResponse> => {
    const { data } = await serverApi.PUT('/api/v1/dashboards/{id}', { params: { path: { id } }, body });
    return data as DashboardResponse;
  },
);

/**
 * Set or clear a dashboard's default flag. Re-reads the dashboard first and refuses rather than clobber
 * one that changed since the caller rendered it: `updatedAt` is the version the caller showed.
 */
export const saveDefaultDashboard = createDomainAction(
  { fallbackError: 'Failed to update default dashboard' },
  async (id: string, makeDefault: boolean, updatedAt: string): Promise<{ data: DashboardResponse | undefined }> => {
    const { data: current } = await serverApi.GET('/api/v1/dashboards/{id}', { params: { path: { id } } });
    if (!current) throw new AppError('Dashboard not found');
    if (current.updatedAt !== updatedAt) {
      throw new AppError(
        'This dashboard changed since the page was loaded. Reload and try again — setting the default would otherwise discard those changes.',
      );
    }
    const { data } = await serverApi.PUT('/api/v1/dashboards/{id}', {
      params: { path: { id } },
      body: {
        name: current.name,
        description: current.description ?? undefined,
        isDefault: makeDefault,
        widgets: current.widgets.map(toDashboardWidget),
      },
    });
    return { data: data as DashboardResponse | undefined };
  },
);
