'use client';

import React from 'react';

import { ShellPage } from '@/features/shell/ShellPage';

import { NEW_REPORT_HREF } from './reportsList';

/** The frame of the Reports list: the top bar (with the + for a new report), then the page. */
export function ReportsShell({ children }: { children: React.ReactNode }) {
  return (
    <ShellPage crumb="Insights" title="Reports" flushTop addHref={NEW_REPORT_HREF} addLabel="New report">
      {children}
    </ShellPage>
  );
}
