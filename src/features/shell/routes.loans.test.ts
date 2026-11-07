import { describe, expect, it } from 'vitest';

import { getActiveNavItem, shellRailGroups } from './navigation';
import { appHref } from './routes';

describe('Lending and Loans routes', () => {
  it('maps both areas to their Dinero pages', () => {
    expect(appHref('/loans')).toBe('/loans');
    expect(appHref('/lending')).toBe('/lending');
    expect(appHref('/lending?filter=owed')).toBe('/lending?filter=owed');
  });

  it('maps a loan page to its Dinero page and keeps the query string', () => {
    expect(appHref('/loans/l1')).toBe('/loans/l1');
    expect(appHref('/loans/l1?installment=2')).toBe('/loans/l1?installment=2');
    expect(appHref('/loans/l1/')).toBe('/loans/l1');
  });

  it("maps a person's page to its Dinero page, keeps the query string, and sends the old calendar page to Upcoming", () => {
    expect(appHref('/lending/c1')).toBe('/lending/c1');
    expect(appHref('/lending/c1?export=1')).toBe('/lending/c1?export=1');
    expect(appHref('/loans/calendar')).toBe('/upcoming');
  });

  it('sends the old Lendings pages, a person included, to /lending', () => {
    expect(appHref('/loans/lendings')).toBe('/lending');
    expect(appHref('/loans/lendings?filter=owed')).toBe('/lending?filter=owed');
    expect(appHref('/loans/lendings/c1')).toBe('/lending/c1');
    expect(appHref('/loans/lendings/c1?export=1')).toBe('/lending/c1?export=1');
  });

  it('points the Lending nav item at /lending', () => {
    const item = shellRailGroups.flatMap((g) => g.items).find((i) => i.id === 'lending');
    expect(appHref(item!.href)).toBe('/lending');
  });

  it('highlights Lending on its pages and Accounts on the Loans pages', () => {
    for (const path of ['/lending', '/lending/c1']) expect(getActiveNavItem(path), path).toBe('lending');
    for (const path of ['/loans', '/loans/l1']) expect(getActiveNavItem(path), path).toBe('accounts');
  });
});
