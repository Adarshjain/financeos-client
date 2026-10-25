'use client';

import Link from 'next/link';
import React from 'react';

import { type TabItem, Tabs } from '@/components/ds';

import { DASHBOARDS_HREF, REPORTS_HREF } from './reportsList';

export interface ReportsTabsProps {
  /** How many dashboards there are; undefined while it loads. */
  dashboards?: number;
  /** How many reports there are; undefined while it loads. */
  reports?: number;
  /** Which tab is current; default Reports. */
  active?: 'dashboards' | 'reports';
}

/** The Dashboards · Reports tab strip, shared by both lists. */
export function ReportsTabs({ dashboards, reports, active = 'reports' }: ReportsTabsProps) {
  const items: TabItem[] = [
    { value: 'dashboards', label: 'Dashboards', count: dashboards, asChild: true, children: <Link href={DASHBOARDS_HREF} /> },
    { value: 'reports', label: 'Reports', count: reports, asChild: true, children: <Link href={REPORTS_HREF} /> },
  ];
  return <Tabs items={items} value={active} />;
}
