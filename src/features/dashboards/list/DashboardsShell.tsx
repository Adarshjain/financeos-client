'use client';

import React from 'react';

import { ShellPage } from '@/features/shell/ShellPage';

import { NEW_DASHBOARD_HREF } from '../routes';

/** The frame of the Dashboards list: the top bar (its + is New dashboard), then the page. */
export function DashboardsShell({ children }: { children: React.ReactNode }) {
  return (
    <ShellPage crumb="Insights" title="Dashboards" flushTop addHref={NEW_DASHBOARD_HREF} addLabel="New dashboard">
      {children}
    </ShellPage>
  );
}
