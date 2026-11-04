import { describe, expect, it } from 'vitest';

import { activeSettingsSection, isSettingsIndex, settingsGroups, settingsSections } from './settingsSections';

describe('settingsSections', () => {
  it('groups the eight sections, the first group without a heading', () => {
    expect(settingsGroups.map((g) => [g.label, g.sections.map((s) => s.label)])).toEqual([
      [undefined, ['Profile']],
      ['General', ['Appearance', 'App lock', 'Notifications']],
      ['Data', ['Connections', 'AI']],
      ['Help', ['Activity', 'Debug']],
    ]);
    expect(settingsSections.map((s) => s.href)).toEqual([
      '/settings/profile',
      '/settings/appearance',
      '/settings/app-lock',
      '/settings/notifications',
      '/settings/connections',
      '/settings/ai',
      '/settings/activity',
      '/settings/debug',
    ]);
  });

  it.each([
    ['/settings', 'profile'],
    ['/settings/', 'profile'],
    ['/settings/profile', 'profile'],
    ['/settings/app-lock', 'app-lock'],
    ['/settings/appearance', 'appearance'],
    ['/settings/activity/', 'activity'],
    ['/settings/debug/deep', 'debug'],
    ['/settings/unknown', 'profile'],
    [null, 'profile'],
  ])('maps %s to %s', (path, id) => {
    expect(activeSettingsSection(path).id).toBe(id);
  });

  it('knows the index path', () => {
    expect(isSettingsIndex('/settings')).toBe(true);
    expect(isSettingsIndex('/settings/')).toBe(true);
    expect(isSettingsIndex('/settings/ai')).toBe(false);
  });
});
