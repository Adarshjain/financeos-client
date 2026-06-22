'use server';

import { revalidatePath } from 'next/cache';

import { ApiError, dashboardsApi } from '@/lib/apiClient';
import type {
  CreateDashboardRequest,
  DashboardResponse,
  DashboardWidget,
  UpdateDashboardRequest,
} from '@/lib/dashboards.types';
import type { ApiResult, ErrorResponse } from '@/lib/types';

function handleDashboardError(error: unknown, defaultMessage: string): { success: false; error: ErrorResponse } {
  if (error instanceof ApiError) {
    return { success: false, error: error.response };
  }
  return {
    success: false,
    error: {
      code: 'UNKNOWN_ERROR',
      message: defaultMessage,
      timestamp: new Date().toISOString(),
    },
  };
}

// Create a new dashboard.
export async function createDashboard(
  dashboardRequest: CreateDashboardRequest,
): Promise<ApiResult<DashboardResponse>> {
  try {
    const dashboard = await dashboardsApi.create(dashboardRequest);
    revalidatePath('/dashboards');
    revalidatePath('/dashboard');
    return { success: true, data: dashboard };
  } catch (error) {
    return handleDashboardError(error, 'Failed to create dashboard');
  }
}

// Update a dashboard — replaces name, description, and the full widget set.
export async function updateDashboard(
  dashboardId: string,
  dashboardRequest: UpdateDashboardRequest,
): Promise<ApiResult<DashboardResponse>> {
  try {
    const dashboard = await dashboardsApi.update(dashboardId, dashboardRequest);
    revalidatePath('/dashboards');
    revalidatePath('/dashboard');
    revalidatePath(`/dashboards/${dashboardId}`);
    return { success: true, data: dashboard };
  } catch (error) {
    return handleDashboardError(error, 'Failed to update dashboard');
  }
}

// Set (or clear) a dashboard as the user's default. The update endpoint
// replaces the full meta, so we re-send the dashboard's current name,
// description, and widget set with only `isDefault` changed. The backend
// clears any previous default automatically when `makeDefault` is true.
export async function setDefaultDashboard(
  dashboardId: string,
  makeDefault: boolean,
): Promise<ApiResult<DashboardResponse>> {
  try {
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
    revalidatePath('/dashboards');
    revalidatePath('/dashboard');
    revalidatePath(`/dashboards/${dashboardId}`);
    return { success: true, data: dashboard };
  } catch (error) {
    return handleDashboardError(error, 'Failed to update default dashboard');
  }
}

// Delete a dashboard.
export async function deleteDashboard(
  dashboardId: string,
): Promise<ApiResult<void>> {
  try {
    await dashboardsApi.delete(dashboardId);
    revalidatePath('/dashboards');
    return { success: true, data: undefined };
  } catch (error) {
    return handleDashboardError(error, 'Failed to delete dashboard');
  }
}
