'use client';

import { usePathname } from 'next/navigation';
import React from 'react';

import { areaCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';

import { activeSettingsSection, SETTINGS_HREF } from './settingsSections';

/**
 * The Settings frame, applied once by the settings route layout: one column. `/settings` is the main page;
 * a section is a drill-in under a top bar titled with its name and the back button to Settings at every width.
 */
export function SettingsShell({ children }: { children: React.ReactNode }) {
  const active = activeSettingsSection(usePathname());

  return (
    <ShellPage
      title={active ? active.label : 'Settings'}
      crumb={areaCrumb('settings')}
      backHref={active ? SETTINGS_HREF : undefined}
    >
      <div className="w-full max-w-container-lg mx-auto">{children}</div>
    </ShellPage>
  );
}
