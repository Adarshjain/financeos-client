'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

import { type TabItem, Tabs } from '@/components/ds/Tabs/Tabs';
import { areaCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';

import { activeSettingsTab, settingsTabs } from './settingsTabs';

/**
 * The Settings page frame, applied once by the settings route layout: top bar (title and crumb follow
 * the route), then the route tab strip, then the tab's page as `children`. A tab adds only its own
 * `page.tsx` (and `loading.tsx`) under `/settings/<tab>`; it never renders the top bar or tabs.
 */
export function SettingsShell({ children }: { children: React.ReactNode }) {
  const tab = activeSettingsTab(usePathname());

  const items: TabItem[] = settingsTabs.map((t) => ({
    value: t.id,
    label: t.label,
    asChild: true,
    children: <Link href={t.href} />,
  }));

  return (
    <ShellPage title={tab.title} crumb={areaCrumb('settings')} flushTop>
      <div className="flex flex-col gap-space-8 desk:gap-space-16">
        <Tabs items={items} value={tab.id} />
        {children}
      </div>
    </ShellPage>
  );
}
