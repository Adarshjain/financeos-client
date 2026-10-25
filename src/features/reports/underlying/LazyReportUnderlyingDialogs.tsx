'use client';

// The Dinero underlying-data dialogs, loaded on demand: dashboard widgets mount them only after a tap, so their
// code is fetched then rather than with the dashboard. Same props as ReportUnderlyingDialog / ReportRowBreakdownDialog.

import dynamic from 'next/dynamic';

import type { ReportRowBreakdownDialogProps } from './ReportRowBreakdownDialog';
import type { ReportUnderlyingDialogProps } from './ReportUnderlyingDialog';

export const LazyReportUnderlyingDialog = dynamic<ReportUnderlyingDialogProps>(
  () => import('./ReportUnderlyingDialog').then((m) => m.ReportUnderlyingDialog),
  { ssr: false },
);

export const LazyReportRowBreakdownDialog = dynamic<ReportRowBreakdownDialogProps>(
  () => import('./ReportRowBreakdownDialog').then((m) => m.ReportRowBreakdownDialog),
  { ssr: false },
);
