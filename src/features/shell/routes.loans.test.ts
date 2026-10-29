import { describe, expect, it } from 'vitest';

import { getActiveNavItem, shellRailGroups } from './navigation';
import { appHref, isBuiltRoute, normalisePathname } from './routes';

describe('Loans & lendings routes', () => {
  it('maps both tabs to their Dinero pages', () => {
    expect(appHref('/loans')).toBe('/loans');
    expect(appHref('/loans/lendings')).toBe('/loans/lendings');
    expect(appHref('/loans/lendings?filter=owed')).toBe('/loans/lendings?filter=owed');
    expect(isBuiltRoute('/loans')).toBe(true);
    expect(isBuiltRoute('/loans/lendings')).toBe(true);
  });

  it('maps a loan page to its Dinero page and keeps the query string', () => {
    expect(appHref('/loans/l1')).toBe('/loans/l1');
    expect(appHref('/loans/l1?installment=2')).toBe('/loans/l1?installment=2');
    expect(appHref('/loans/l1/')).toBe('/loans/l1');
    expect(isBuiltRoute('/loans/l1')).toBe(true);
    expect(isBuiltRoute('/loans/l1/extra')).toBe(false);
  });

  it("maps a person's page to its Dinero page, keeps the query string, and leaves unknown sub-paths on Legacy", () => {
    expect(appHref('/loans/lendings/c1')).toBe('/loans/lendings/c1');
    expect(appHref('/loans/lendings/c1?export=1')).toBe('/loans/lendings/c1?export=1');
    expect(isBuiltRoute('/loans/lendings/c1/extra')).toBe(false);
    expect(appHref('/loans/calendar')).toBe('/legacy/loans/calendar');
    expect(appHref('/loans/calendar/x/y')).toBe('/legacy/loans/calendar/x/y');
  });

  it('points the nav item at Lendings, the default', () => {
    const item = shellRailGroups.flatMap((g) => g.items).find((i) => i.id === 'loans');
    expect(appHref(item!.href)).toBe('/loans/lendings');
  });

  it('highlights the nav item on both tabs and on the Legacy detail pages', () => {
    for (const path of ['/loans', '/loans/lendings', '/loans', '/loans/lendings', '/loans/l1', '/loans/l1', '/loans/lendings/c1']) {
      expect(getActiveNavItem(path), path).toBe('loans');
    }
    expect(normalisePathname('/loans/lendings')).toBe('/loans/lendings');
  });
});
