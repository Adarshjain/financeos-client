import { describe, expect, it } from 'vitest';

import { activeSettingsTab, settingsTabs } from './settingsTabs';

describe('settingsTabs', () => {
  it('lists the six tabs in board order on /ds/settings routes', () => {
    expect(settingsTabs.map((t) => [t.label, t.href])).toEqual([
      ['Profile & appearance', '/ds/settings'],
      ['Connections', '/ds/settings/connections'],
      ['AI', '/ds/settings/ai'],
      ['Notifications', '/ds/settings/notifications'],
      ['Activity', '/ds/settings/activity'],
      ['Debug', '/ds/settings/debug'],
    ]);
  });

  it.each([
    ['/ds/settings', 'profile'],
    ['/ds/settings/', 'profile'],
    ['/ds/settings/connections', 'connections'],
    ['/ds/settings/ai', 'ai'],
    ['/ds/settings/activity/', 'activity'],
    ['/ds/settings/debug/deep', 'debug'],
    ['/ds/settings/unknown', 'profile'],
    [null, 'profile'],
  ])('maps %s to %s', (path, id) => {
    expect(activeSettingsTab(path).id).toBe(id);
  });
});
