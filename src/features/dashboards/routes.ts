import { appHref } from '@/features/shell/routes';

/** The Dashboards list. */
export const DASHBOARDS_HREF = appHref('/dashboards');

export const dashboardHref = (id: string): string => appHref(`/dashboards/${id}`);

export const NEW_DASHBOARD_HREF = appHref('/dashboards/new');

/** Home: the default dashboard under the greeting. */
export const HOME_HREF = appHref('/dashboard');

/** A dashboard's page opened straight into editing. */
export const editDashboardHref = (id: string): string => appHref(`/dashboards/${id}?edit=1`);
