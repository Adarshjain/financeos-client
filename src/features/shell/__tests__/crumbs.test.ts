import { describe, expect, it } from 'vitest';

import { areaCrumb, crumbMap, subCrumb } from '../navigation';

describe('crumb map', () => {
  it('an area own pages show its rail group', () => {
    expect(areaCrumb('accounts')).toBe('Money');
    expect(areaCrumb('investments')).toBe('Grow');
    expect(areaCrumb('loans')).toBe('Owe & lend');
    expect(areaCrumb('reports')).toBe('Insights');
  });

  it('a page beneath an area shows the group, the area, then the trail', () => {
    expect(subCrumb('accounts')).toBe('Money / Accounts');
    expect(subCrumb('transactions', 'Import')).toBe('Money / Transactions / Import');
  });

  it('Home, Notifications and Settings have crumbs like the rest', () => {
    expect(areaCrumb('home')).toBeTruthy();
    expect(areaCrumb('notifications')).toBeTruthy();
    expect(areaCrumb('settings')).toBe('Settings');
  });

  it('every area points at its own page', () => {
    for (const entry of Object.values(crumbMap)) expect(entry.href.startsWith('/')).toBe(true);
  });
});
