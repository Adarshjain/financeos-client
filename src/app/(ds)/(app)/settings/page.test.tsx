import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/settings/profile/ProfilePage', () => ({ ProfilePage: () => null }));

import { ProfilePage } from '@/features/settings/profile/ProfilePage';

import DsSettingsIndexPage from './page';
import DsSettingsProfilePage from './profile/page';

describe('Settings Profile routes', () => {
  it.each([
    ['/settings', DsSettingsIndexPage],
    ['/settings/profile', DsSettingsProfilePage],
  ])('%s renders the one shared Profile section', (_path, Page) => {
    const element = Page() as React.ReactElement;
    expect(element.type).toBe(ProfilePage);
  });
});
