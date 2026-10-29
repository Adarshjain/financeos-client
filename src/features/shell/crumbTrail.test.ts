import React from 'react';
import { describe, expect, it } from 'vitest';

import { crumbParentHref, trimCrumb } from './crumbTrail';
import { areaCrumb, crumbMap, subCrumb } from './navigation';

describe('trimCrumb', () => {
  it('drops a trailing segment that repeats the title', () => {
    expect(trimCrumb('Inbox / Notifications', 'Notifications')).toBe('Inbox');
    expect(trimCrumb('Money / Accounts', 'Accounts')).toBe('Money');
  });

  it('drops the whole crumb when it is only the title', () => {
    expect(trimCrumb('Settings', 'Settings')).toBeUndefined();
  });

  it('keeps a crumb that does not repeat the title, and node crumbs or titles', () => {
    expect(trimCrumb('Money / Accounts', 'HDFC Savings')).toBe('Money / Accounts');
    expect(trimCrumb('Money / Accounts', React.createElement('b'))).toBe('Money / Accounts');
  });
});

describe('crumbParentHref', () => {
  it('a crumb two or more deep goes back to its list', () => {
    expect(crumbParentHref(subCrumb('accounts'))).toBe(crumbMap.accounts.href);
    expect(crumbParentHref(subCrumb('transactions', 'Import'))).toBe(crumbMap.transactions.href);
  });

  it('a one-segment crumb (a list or single-page area) has no back', () => {
    expect(crumbParentHref(areaCrumb('accounts'))).toBeUndefined();
    expect(crumbParentHref(undefined)).toBeUndefined();
  });
});
