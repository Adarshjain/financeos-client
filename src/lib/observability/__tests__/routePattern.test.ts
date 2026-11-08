import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { KNOWN_ROOT_SEGMENTS, routePattern } from '../routePattern';

describe('routePattern', () => {
  it('keeps static routes and drops the query and hash', () => {
    expect(routePattern('/transactions?q=abc&page=2')).toBe('/transactions');
    expect(routePattern('/settings/connections#x')).toBe('/settings/connections');
    expect(routePattern('/')).toBe('/');
  });
  it('replaces uuids, numeric ids, hex and opaque ids', () => {
    expect(routePattern('/accounts/3f2b8c1e-1a2b-4c3d-8e9f-0123456789ab/statements')).toBe('/accounts/[id]/statements');
    expect(routePattern('/loans/12345')).toBe('/loans/[id]');
    expect(routePattern('/loans/0123456789abcdef0123')).toBe('/loans/[id]');
    expect(routePattern('/reports/a1b2c3d4e5f6g7h8i9j0k1')).toBe('/reports/[id]');
  });
  it('keeps ordinary words', () => {
    expect(routePattern('/accounts/statements/import')).toBe('/accounts/statements/import');
  });
  it('maps unknown first segments to [unknown]', () => {
    expect(routePattern('/wp-admin/x')).toBe('/[unknown]');
    expect(routePattern('/accountz')).toBe('/[unknown]');
  });
  it('knows every first-level route folder of src/app', () => {
    const root = join(process.cwd(), 'src/app/(ds)');
    const folders: string[] = [];
    for (const group of readdirSync(root, { withFileTypes: true })) {
      if (!group.isDirectory() || !group.name.startsWith('(')) continue;
      for (const d of readdirSync(join(root, group.name), { withFileTypes: true })) {
        if (d.isDirectory() && !/^[([]/.test(d.name)) folders.push(d.name);
      }
    }
    expect(folders.length).toBeGreaterThan(5);
    for (const f of folders) expect(KNOWN_ROOT_SEGMENTS).toContain(f);
  });
});
