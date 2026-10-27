import { describe, expect, it } from 'vitest';

import { appHref } from '@/features/shell/routes';

import { dashboardHref, DASHBOARDS_HREF, editDashboardHref, HOME_HREF, NEW_DASHBOARD_HREF } from './routes';

describe('dashboard routes', () => {
  it('a dashboard and New dashboard are Dinero pages; the list and Home are too', () => {
    expect(dashboardHref('d1')).toBe('/dashboards/d1');
    expect(NEW_DASHBOARD_HREF).toBe('/dashboards/new');
    expect(DASHBOARDS_HREF).toBe('/dashboards');
    expect(HOME_HREF).toBe('/dashboard');
    expect(editDashboardHref('d1')).toBe('/dashboards/d1?edit=1');
    expect(appHref('/dashboards/d1?edit=1')).toBe('/dashboards/d1?edit=1');
  });

  it('does not take a deeper path or a look-alike', () => {
    expect(appHref('/dashboards/d1/other')).toBe('/legacy/dashboards/d1/other');
    expect(appHref('/dashboardsx/d1')).toBe('/legacy/dashboardsx/d1');
  });
});
