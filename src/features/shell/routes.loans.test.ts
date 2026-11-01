import { describe, expect, it } from 'vitest';

import { getActiveNavItem, shellRailGroups } from './navigation';
import { appHref } from './routes';

describe('Loans & lendings routes', () => {
  it('maps both tabs to their Dinero pages', () => {
    expect(appHref('/loans')).toBe('/loans');
    expect(appHref('/loans/lendings')).toBe('/loans/lendings');
    expect(appHref('/loans/lendings?filter=owed')).toBe('/loans/lendings?filter=owed');
  });

  it('maps a loan page to its Dinero page and keeps the query string', () => {
    expect(appHref('/loans/l1')).toBe('/loans/l1');
    expect(appHref('/loans/l1?installment=2')).toBe('/loans/l1?installment=2');
    expect(appHref('/loans/l1/')).toBe('/loans/l1');
  });

  it("maps a person's page to its Dinero page, keeps the query string, and sends the old calendar page to Upcoming", () => {
    expect(appHref('/loans/lendings/c1')).toBe('/loans/lendings/c1');
    expect(appHref('/loans/lendings/c1?export=1')).toBe('/loans/lendings/c1?export=1');
    expect(appHref('/loans/calendar')).toBe('/upcoming');
  });

  it('points the nav item at Lendings, the default', () => {
    const item = shellRailGroups.flatMap((g) => g.items).find((i) => i.id === 'loans');
    expect(appHref(item!.href)).toBe('/loans/lendings');
  });

  it('highlights the nav item on both tabs and on the detail pages', () => {
    for (const path of ['/loans', '/loans/lendings', '/loans', '/loans/lendings', '/loans/l1', '/loans/l1', '/loans/lendings/c1']) {
      expect(getActiveNavItem(path), path).toBe('loans');
    }
  });
});
