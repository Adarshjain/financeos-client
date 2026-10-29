import { describe, expect, it } from 'vitest';

import { parseDashboardUrl } from './dashboardUrl';

describe('parseDashboardUrl', () => {
  it('opens editing for ?edit=1', () => {
    expect(parseDashboardUrl({ edit: '1' })).toEqual({ startEditing: true });
  });

  it('takes the first of a repeated key', () => {
    expect(parseDashboardUrl({ edit: ['1', '0'] })).toEqual({ startEditing: true });
  });

  it('views the dashboard for anything else', () => {
    expect(parseDashboardUrl({ edit: '0' })).toEqual({ startEditing: false });
    expect(parseDashboardUrl({})).toEqual({ startEditing: false });
  });
});
