'use client';

import Link from 'next/link';
import React from 'react';

import { type TabItem, Tabs } from '@/components/ds';
import { ShellPage } from '@/features/shell/ShellPage';

import { DASHBOARDS_HREF, NEW_REPORT_HREF, REPORTS_HREF } from './reportsList';

const items: TabItem[] = [
  { value: 'dashboards', label: 'Dashboards', asChild: true, children: <Link href={DASHBOARDS_HREF} /> },
  { value: 'reports', label: 'Reports', asChild: true, children: <Link href={REPORTS_HREF} /> },
];

/** The frame of the Reports list: the top bar (with the + for a new report), then the Dashboards · Reports tab strip, then the page. */
export function ReportsShell({ children }: { children: React.ReactNode }) {
  return (
    <ShellPage crumb="Insights" title="Reports" flushTop addHref={NEW_REPORT_HREF} addLabel="New report">
      <div className="flex flex-col gap-space-12 desk:gap-space-16">
        <Tabs items={items} value="reports" />
        {children}
      </div>
    </ShellPage>
  );
}
