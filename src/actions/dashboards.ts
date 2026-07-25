'use server';

import { revalidatePath } from 'next/cache';

import { dashboardsApi } from '@/lib/apiClient';
import { apiResult,AppError } from '@/lib/apiResult';
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

// Set (or clear) a dashboard as the user's default.
//
// There is no PATCH endpoint, and PUT replaces the entire dashboard, so this has
// to read the current state and write it back with only `isDefault` changed —
// which risks clobbering an edit made in the meantime.
//
// `expectedUpdatedAt` narrows that: the caller passes the `updatedAt` of the
// dashboard it rendered, and if the server's copy has moved on we refuse instead
// of overwriting. That covers the realistic case — a list left open while the
// dashboard was edited elsewhere.
//
// It does NOT close the window between this GET and this PUT. Closing that
// properly needs the backend to accept either `PATCH { isDefault }` or an
// If-Match precondition; until then the exposure is a few hundred milliseconds
// rather than however long the page was open.
export async function setDefaultDashboard(
  dashboardId: string,
  makeDefault: boolean,
  expectedUpdatedAt?: string,
): Promise<ApiResult<DashboardResponse>> {
  return apiResult('Failed to update default dashboard', async () => {
    const current = await dashboardsApi.getById(dashboardId);

    if (expectedUpdatedAt && current.updatedAt !== expectedUpdatedAt) {
      throw new AppError(
        'This dashboard changed since the page was loaded. Reload and try again — ' +
          'setting the default would otherwise discard those changes.',
        'CONFLICT',
      );
    }

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
