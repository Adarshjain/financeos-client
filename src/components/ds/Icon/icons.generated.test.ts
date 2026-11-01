import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { CATEGORY_LIST_FIXTURE } from '@/lib/categoryList.fixtures';

import { iconData } from './icons.generated';

const mapping = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'design-system/icons.json'), 'utf8'),
) as Array<{ name: string }>;

describe('icons.generated.ts', () => {
  it('is in sync with design-system/icons.json (run node design-system/tools/gen-icons.mjs)', () => {
    expect(Object.keys(iconData).sort()).toEqual(mapping.map((i) => i.name).sort());
  });

  it('has bold shapes for every icon', () => {
    for (const [name, data] of Object.entries(iconData)) {
      expect(data.bold.length, name).toBeGreaterThan(0);
    }
  });

  it('has fill shapes for warning', () => {
    expect(iconData.warning.fill?.length).toBeGreaterThan(0);
  });

  it('has every category icon of the fixed list the server serves', () => {
    const missing = CATEGORY_LIST_FIXTURE.map((c) => c.icon).filter((name) => !(name in iconData));
    expect(missing).toEqual([]);
  });

  // The server repo sits beside this one in the workspace; CI of the client alone has no copy, so the check skips there.
  const taxonomyPath = path.resolve(process.cwd(), '../financeos-server/src/main/resources/categorize/taxonomy.json');
  it.skipIf(!fs.existsSync(taxonomyPath))('has every icon named in the server taxonomy.json, and the fixture matches its category keys', () => {
    const taxonomy = JSON.parse(fs.readFileSync(taxonomyPath, 'utf8')) as { categories: { key: string; icon: string }[] };
    const missing = taxonomy.categories.map((c) => c.icon).filter((name) => !(name in iconData));
    expect(missing).toEqual([]);
    expect(CATEGORY_LIST_FIXTURE.map((c) => c.key).sort()).toEqual(taxonomy.categories.map((c) => c.key).sort());
  });
});
