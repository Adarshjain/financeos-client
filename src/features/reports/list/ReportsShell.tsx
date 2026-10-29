'use client';

import React from 'react';

import { areaCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';

import { NEW_REPORT_HREF } from './reportsListModel';

/** The frame of the Reports list: the top bar (with the + for a new report), then the page. */
export function ReportsShell({ children }: { children: React.ReactNode }) {
  return (
    <ShellPage crumb={areaCrumb('reports')} title="Reports" flushTop addHref={NEW_REPORT_HREF} addLabel="Add report">
      {children}
    </ShellPage>
  );
}
