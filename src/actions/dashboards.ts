'use server';

import { revalidatePath } from 'next/cache';

import { dashboardsApi } from '@/lib/apiClient';
import { apiResult } from '@/lib/apiResult';
import type {
  CreateDashboardRequest,
  DashboardResponse,
  DashboardWidget,
  UpdateDashboardRequest,
} from '@/lib/dashboards.types';
import type { ApiResult } from '@/lib/types';

/** `/dashboard` renders the default dashboard, so it depends on the list too. */
function revalidateDashboardViews(dashboardId?: string): void {
  revalidatePath('/dashboards');
  revalidatePath('/dashboard');
  if (dashboardId) revalidatePath(`/dashboards/${dashboardId}`);
}

// Create a new dashboard.
export async function createDashboard(
  dashboardRequest: CreateDashboardRequest,
): Promise<ApiResult<DashboardResponse>> {
  return apiResult('Failed to create dashboard', async () => {
    const dashboard = await dashboardsApi.create(dashboardRequest);
    revalidateDashboardViews();
    return dashboard;
  });
}

// Update a dashboard — replaces name, description, and the full widget set.
export async function updateDashboard(
  dashboardId: string,
  dashboardRequest: UpdateDashboardRequest,
): Promise<ApiResult<DashboardResponse>> {
  return apiResult('Failed to update dashboard', async () => {
    const dashboard = await dashboardsApi.update(dashboardId, dashboardRequest);
    revalidateDashboardViews(dashboardId);
    return dashboard;
  });
}

// Set (or clear) a dashboard as the user's default. The update endpoint
// replaces the full meta, so we re-send the dashboard's current name,
// description, and widget set with only `isDefault` changed. The backend
// clears any previous default automatically when `makeDefault` is true.
//
// NOTE: this is a read-modify-write with no concurrency guard — an edit saved
// between the GET and the PUT is silently overwritten by this snapshot. Needs a
// backend PATCH { isDefault } to fix properly.
export async function setDefaultDashboard(
  dashboardId: string,
  makeDefault: boolean,
): Promise<ApiResult<DashboardResponse>> {
  return apiResult('Failed to update default dashboard', async () => {
    const current = await dashboardsApi.getById(dashboardId);
    const widgets: DashboardWidget[] = current.widgets.map((w) => ({
      id: w.id,
      reportId: w.reportId,
      title: w.title,
      layout: w.layout,
    }));
    const dashboard = await dashboardsApi.update(dashboardId, {
      name: current.name,
      description: current.description,
      isDefault: makeDefault,
      widgets,
    });
    revalidateDashboardViews(dashboardId);
    return dashboard;
  });
}

// Delete a dashboard.
export async function deleteDashboard(
  dashboardId: string,
): Promise<ApiResult<void>> {
  return apiResult('Failed to delete dashboard', async () => {
    await dashboardsApi.delete(dashboardId);
    revalidateDashboardViews();
  });
}
