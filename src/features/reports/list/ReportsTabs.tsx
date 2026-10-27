'use client';

import Link from 'next/link';
import React from 'react';

import { type TabItem, Tabs } from '@/components/ds';

import { DASHBOARDS_HREF, REPORTS_HREF } from './reportsList';

export interface ReportsTabsProps {
  /** Which tab is current; default Reports. */
  active?: 'dashboards' | 'reports';
}

/** The Dashboards · Reports tab strip, shared by both lists. */
export function ReportsTabs({ active = 'reports' }: ReportsTabsProps) {
  const items: TabItem[] = [
    { value: 'dashboards', label: 'Dashboards', asChild: true, children: <Link href={DASHBOARDS_HREF} /> },
    { value: 'reports', label: 'Reports', asChild: true, children: <Link href={REPORTS_HREF} /> },
  ];
  return <Tabs items={items} value={active} />;
}
