import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

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
});
