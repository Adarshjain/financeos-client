import { describe, expect, it } from 'vitest';

import {
  activeDataSourcesSection,
  dataSourcesSection,
  dataSourcesSections,
  isDataSourcesIndex,
} from './dataSourcesSections';

describe('dataSourcesSections', () => {
  it('lists Connections, Imports and Sync health with their routes', () => {
    expect(dataSourcesSections.map((s) => [s.label, s.href])).toEqual([
      ['Connections', '/data-sources/connections'],
      ['Imports', '/data-sources/imports'],
      ['Sync health', '/data-sources/sync'],
    ]);
    expect(dataSourcesSection('sync').label).toBe('Sync health');
  });

  it.each([
    ['/data-sources/sync/', 'sync'],
    ['/data-sources/imports', 'imports'],
    ['/data-sources/connections', 'connections'],
    ['/data-sources', undefined],
    ['/data-sources/unknown', undefined],
    ['/settings/activity', undefined],
    [null, undefined],
  ])('maps %s to %s', (path, id) => {
    expect(activeDataSourcesSection(path)?.id).toBe(id);
  });

  it('knows the index path', () => {
    expect(isDataSourcesIndex('/data-sources')).toBe(true);
    expect(isDataSourcesIndex('/data-sources/')).toBe(true);
    expect(isDataSourcesIndex('/data-sources/imports')).toBe(false);
  });
});
