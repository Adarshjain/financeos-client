'use server';

import { dashboardsApi } from '@/lib/apiClient';
import { AppError } from '@/lib/apiResult';
import type {
  CreateDashboardRequest,
  DashboardWidget,
  UpdateDashboardRequest,
} from '@/lib/dashboards.types';
import { createDomainAction } from '@/lib/domainApi';

const DASHBOARD_PATHS = ['/dashboards', '/dashboard'];

export const createDashboard = createDomainAction(
  { fallbackError: 'Failed to create dashboard', revalidatePaths: DASHBOARD_PATHS },
  (dashboardRequest: CreateDashboardRequest) => dashboardsApi.create(dashboardRequest)
);

export const updateDashboard = createDomainAction(
  { fallbackError: 'Failed to update dashboard', revalidatePaths: DASHBOARD_PATHS },
  (dashboardId: string, dashboardRequest: UpdateDashboardRequest) => dashboardsApi.update(dashboardId, dashboardRequest)
);

export const setDefaultDashboard = createDomainAction(
  { fallbackError: 'Failed to update default dashboard', revalidatePaths: DASHBOARD_PATHS },
  async (dashboardId: string, makeDefault: boolean, expectedUpdatedAt?: string) => {
    const current = await dashboardsApi.getById(dashboardId);
    if (expectedUpdatedAt && current.updatedAt !== expectedUpdatedAt) {
      throw new AppError(
        'This dashboard changed since the page was loaded. Reload and try again — setting the default would otherwise discard those changes.',
        'CONFLICT',
      );
    }
    const widgets: DashboardWidget[] = current.widgets.map((w) => ({
      id: w.id,
      reportId: w.reportId,
      title: w.title,
      layout: w.layout,
    }));
    return dashboardsApi.update(dashboardId, {
      name: current.name,
      description: current.description,
      isDefault: makeDefault,
      widgets,
    });
  }
);

export const deleteDashboard = createDomainAction(
  { fallbackError: 'Failed to delete dashboard', revalidatePaths: DASHBOARD_PATHS },
  (dashboardId: string) => dashboardsApi.delete(dashboardId)
);
