import { describe, expect, it } from 'vitest';

import { activeSettingsTab, settingsTabs } from './settingsTabs';

describe('settingsTabs', () => {
  it('lists the six tabs in board order on /settings routes', () => {
    expect(settingsTabs.map((t) => [t.label, t.href])).toEqual([
      ['Profile & appearance', '/settings'],
      ['Connections', '/settings/connections'],
      ['AI', '/settings/ai'],
      ['Notifications', '/settings/notifications'],
      ['Activity', '/settings/activity'],
      ['Debug', '/settings/debug'],
    ]);
  });

  it.each([
    ['/settings', 'profile'],
    ['/settings/', 'profile'],
    ['/settings/connections', 'connections'],
    ['/settings/ai', 'ai'],
    ['/settings/activity/', 'activity'],
    ['/settings/debug/deep', 'debug'],
    ['/settings/unknown', 'profile'],
    [null, 'profile'],
  ])('maps %s to %s', (path, id) => {
    expect(activeSettingsTab(path).id).toBe(id);
  });
});
