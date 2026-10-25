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
}

/** The Dashboards · Reports tab strip. Dashboards is not built in Dinero yet, so it stays the Legacy page until it is. */
export function ReportsTabs({ dashboards, reports }: ReportsTabsProps) {
  const items: TabItem[] = [
    { value: 'dashboards', label: 'Dashboards', count: dashboards, asChild: true, children: <Link href={DASHBOARDS_HREF} /> },
    { value: 'reports', label: 'Reports', count: reports, asChild: true, children: <Link href={REPORTS_HREF} /> },
  ];
  return <Tabs items={items} value="reports" />;
}
