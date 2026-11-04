'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

import { areaCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';

import { activeSettingsSection, SETTINGS_HREF } from './settingsSections';

/**
 * The Settings frame, applied once by the settings route layout: one column. `/settings` is the main page;
 * a section is a drill-in under a top bar titled with its name, a back arrow on phone and a crumb back to
 * Settings on desktop.
 */
export function SettingsShell({ children }: { children: React.ReactNode }) {
  const active = activeSettingsSection(usePathname());

  return (
    <ShellPage
      title={active ? active.label : 'Settings'}
      crumb={active ? <Link href={SETTINGS_HREF} prefetch={false}>{areaCrumb('settings')}</Link> : areaCrumb('settings')}
      phoneBackHref={active ? SETTINGS_HREF : undefined}
    >
      <div className="max-w-container-lg">{children}</div>
    </ShellPage>
  );
}
