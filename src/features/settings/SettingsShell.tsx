'use client';

import React from 'react';

import { AreaSectionsShell } from '@/features/shell/AreaSectionsShell';
import { areaCrumb } from '@/features/shell/navigation';

import { SETTINGS_HREF, settingsSections } from './settingsSections';

/**
 * The Settings frame, applied once by the settings route layout: one column. `/settings` is the main page;
 * a section is a drill-in under a top bar titled with its name and the back button to Settings at every width.
 */
export function SettingsShell({ children }: { children: React.ReactNode }) {
  return (
    <AreaSectionsShell title="Settings" crumb={areaCrumb('settings')} indexHref={SETTINGS_HREF} sections={settingsSections}>
      {children}
    </AreaSectionsShell>
  );
}
