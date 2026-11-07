import { describe, expect, it } from 'vitest';

import { activeSettingsSection, isSettingsIndex, settingsSection, settingsSections } from './settingsSections';

describe('settingsSections', () => {
  it('lists the three drill-in sections with their routes', () => {
    expect(settingsSections.map((s) => [s.label, s.href])).toEqual([
      ['Notifications', '/settings/notifications'],
      ['AI', '/settings/ai'],
      ['Debug', '/settings/debug'],
    ]);
    expect(settingsSection('ai').label).toBe('AI');
  });

  it.each([
    ['/settings/connections', undefined],
    ['/settings/activity', undefined],
    ['/settings/debug/deep', 'debug'],
    ['/settings/notifications', 'notifications'],
    ['/settings', undefined],
    ['/settings/profile', undefined],
    ['/settings/unknown', undefined],
    [null, undefined],
  ])('maps %s to %s', (path, id) => {
    expect(activeSettingsSection(path)?.id).toBe(id);
  });

  it('knows the index path', () => {
    expect(isSettingsIndex('/settings')).toBe(true);
    expect(isSettingsIndex('/settings/')).toBe(true);
    expect(isSettingsIndex('/settings/ai')).toBe(false);
  });
});
